# ────────────────────────────────────────────────────────────────────────────
# train_model.py — BankGuard Fraud Detection (Real PaySim Dataset)
#
# Reads the real PaySim CSV dataset and engineers the same 12 behavioural
# features used by the Flask API and Node.js backend.
#
# Dataset: data/Synthetic Financial Datasets For Fraud Detection.csv
#   Source: https://www.kaggle.com/datasets/ealaxi/paysim1
#
# Note on is_new_location:
#   The PaySim dataset has no location column, so is_new_location = 0 for all
#   training rows. The rule engine in transactionController.js handles location-
#   based fraud detection at inference time — the ML model covers the remaining
#   11 behavioural signals and multi-signal combinations.
#
# Output: models/fraud_model.pkl, models/scaler.pkl, models/feature_names.pkl
# ────────────────────────────────────────────────────────────────────────────

import numpy as np
import pandas as pd
import joblib
import os
import warnings

warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

FEATURE_NAMES = [
    'amount',
    'amount_to_avg_ratio',
    'amount_to_max_ratio',
    'amount_to_balance_ratio',
    'velocity_2min',
    'velocity_1hr',
    'is_known_beneficiary',
    'is_new_location',        # always 0 from PaySim (no location col); rule engine handles this
    'transaction_hour',
    'days_since_last_txn',
    'balance_drain',
    'exceeds_balance',
]

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATA_PATH   = os.path.join(BASE_DIR, '..', 'data', 'Synthetic Financial Datasets For Fraud Detection.csv')
MODELS_DIR  = os.path.join(BASE_DIR, '..', 'models')

print("BankGuard Fraud Detection — Training on Real PaySim Dataset")
print("=" * 60)

# ── Step 1: Load dataset ───────────────────────────────────────────────────
print(f"\nLoading dataset from:\n  {DATA_PATH}")
df_raw = pd.read_csv(DATA_PATH)
print(f"Raw shape   : {df_raw.shape}")
print(f"Columns     : {list(df_raw.columns)}")
print(f"\nTransaction types available:")
print(df_raw['type'].value_counts().to_string())
print(f"\nFraud distribution:")
print(df_raw['isFraud'].value_counts().to_string())

# ── Step 2: Filter to fraud-relevant transaction types ─────────────────────
# Only TRANSFER and CASH_OUT transactions can be fraudulent in PaySim
df = df_raw[df_raw['type'].isin(['TRANSFER', 'CASH_OUT'])].copy()
df = df.sort_values(['nameOrig', 'step']).reset_index(drop=True)

print(f"\nAfter filtering to TRANSFER + CASH_OUT:")
print(f"  Rows      : {len(df):,}")
print(f"  Fraud     : {df['isFraud'].sum():,}")
print(f"  Normal    : {(df['isFraud'] == 0).sum():,}")

# ── Step 3: Engineer 12 behavioural features per transaction ───────────────
print("\nEngineering behavioural features — this may take a few minutes...")

GLOBAL_AVG = 5000.0   # baseline for first-time senders (no history)
GLOBAL_MAX = 20000.0

rows = []

for sender, group in df.groupby('nameOrig'):
    group = group.reset_index(drop=True)

    for i, row in group.iterrows():
        history = group.iloc[:i]   # only PAST transactions of this sender

        amount  = row['amount']
        balance = row['oldbalanceOrg']

        # ── Amount ratios ──────────────────────────────────────────
        past_amounts = history['amount'].tolist()
        avg_amount   = np.mean(past_amounts) if past_amounts else GLOBAL_AVG
        max_amount   = np.max(past_amounts)  if past_amounts else GLOBAL_MAX

        amount_to_avg     = amount / avg_amount if avg_amount > 0 else 1.0
        amount_to_max     = amount / max_amount if max_amount > 0 else 1.0
        amount_to_balance = amount / balance    if balance    > 0 else 1.0

        # ── Velocity — step = 1 hour in PaySim ────────────────────
        # vel_2min: count transactions at the same step (same hour)
        vel_2min = len(history[history['step'] == row['step']])
        vel_1hr  = vel_2min   # PaySim has hourly resolution

        # ── Days since last transaction ────────────────────────────
        if len(history) > 0:
            days_since = min((row['step'] - history.iloc[-1]['step']) / 24.0, 30.0)
        else:
            days_since = 30.0

        # ── Known beneficiary ──────────────────────────────────────
        past_dests = history['nameDest'].tolist()
        is_known   = 1 if row['nameDest'] in past_dests else 0

        # ── Transaction hour (PaySim step mod 24) ─────────────────
        txn_hour = int(row['step']) % 24

        # ── Balance drain (strongest fraud signal in PaySim) ───────
        # Fraud pattern: account had money → after txn balance is 0
        new_balance_orig = row['newbalanceOrig']
        balance_drain    = 1 if (balance > 0 and new_balance_orig == 0) else 0

        # ── Exceeds balance ────────────────────────────────────────
        exceeds_balance = 1 if amount >= balance else 0

        rows.append({
            'amount':                  amount,
            'amount_to_avg_ratio':     amount_to_avg,
            'amount_to_max_ratio':     amount_to_max,
            'amount_to_balance_ratio': amount_to_balance,
            'velocity_2min':           vel_2min,
            'velocity_1hr':            vel_1hr,
            'is_known_beneficiary':    is_known,
            'is_new_location':         0,         # PaySim has no location data
            'transaction_hour':        txn_hour,
            'days_since_last_txn':     days_since,
            'balance_drain':           balance_drain,
            'exceeds_balance':         exceeds_balance,
            'isFraud':                 row['isFraud'],
        })

data = pd.DataFrame(rows)
print(f"Done — {len(data):,} rows engineered")
print(f"\nFraud label distribution:")
print(data['isFraud'].value_counts().to_string())
print(f"\nSanity — avg amount_to_avg_ratio:")
print(f"  Normal : {data[data['isFraud']==0]['amount_to_avg_ratio'].mean():.2f}")
print(f"  Fraud  : {data[data['isFraud']==1]['amount_to_avg_ratio'].mean():.2f}")
print(f"Balance drain in fraud vs normal:")
print(f"  Normal : {data[data['isFraud']==0]['balance_drain'].mean()*100:.2f}%")
print(f"  Fraud  : {data[data['isFraud']==1]['balance_drain'].mean()*100:.2f}%")

# ── Step 4: Clip outliers ──────────────────────────────────────────────────
data['amount']                  = data['amount'].clip(1, 500_000)
data['amount_to_avg_ratio']     = data['amount_to_avg_ratio'].clip(0.01, 100)
data['amount_to_max_ratio']     = data['amount_to_max_ratio'].clip(0.01, 100)
data['amount_to_balance_ratio'] = data['amount_to_balance_ratio'].clip(0.001, 5)
data['velocity_2min']           = data['velocity_2min'].clip(0, 20)
data['velocity_1hr']            = data['velocity_1hr'].clip(0, 30)
data['days_since_last_txn']     = data['days_since_last_txn'].clip(0, 30)

# ── Step 5: Scale ──────────────────────────────────────────────────────────
X = data[FEATURE_NAMES]
y = data['isFraud']

print(f"\nDataset: {len(data):,} rows | Fraud: {y.sum():,} ({y.mean()*100:.2f}%)")

scaler   = StandardScaler()
X_scaled = scaler.fit_transform(X)
X_scaled = pd.DataFrame(X_scaled, columns=FEATURE_NAMES)

# ── Step 6: Train/test split ───────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y,
    test_size=0.2,
    random_state=RANDOM_STATE,
    stratify=y,
)
print(f"Train: {len(X_train):,} | Test: {len(X_test):,}")

# ── Step 7: SMOTE to balance classes ──────────────────────────────────────
print("Applying SMOTE...")
smote = SMOTE(random_state=RANDOM_STATE)
X_sm, y_sm = smote.fit_resample(X_train, y_train)
print(f"After SMOTE: Normal={(y_sm==0).sum():,} | Fraud={(y_sm==1).sum():,}")

# ── Step 8: Train XGBoost ─────────────────────────────────────────────────
print("Training XGBoost...")
model = XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    scale_pos_weight=1,
    eval_metric='logloss',
    random_state=RANDOM_STATE,
    tree_method='hist',
    device='cpu',
)
model.fit(X_sm, y_sm, verbose=False)
print("Training done!")

# ── Step 9: Evaluate ──────────────────────────────────────────────────────
y_pred  = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]
auc     = roc_auc_score(y_test, y_proba)
print("\n" + "=" * 60)
print("EVALUATION:")
print(classification_report(y_test, y_pred, target_names=['Normal', 'Fraud']))
print(f"ROC-AUC: {auc:.4f}")
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

# ── Step 10: Save artifacts ────────────────────────────────────────────────
os.makedirs(MODELS_DIR, exist_ok=True)
joblib.dump(model,         os.path.join(MODELS_DIR, 'fraud_model.pkl'))
joblib.dump(scaler,        os.path.join(MODELS_DIR, 'scaler.pkl'))
joblib.dump(FEATURE_NAMES, os.path.join(MODELS_DIR, 'feature_names.pkl'))
print(f"\nSaved to {MODELS_DIR}:")
for fname in ['fraud_model.pkl', 'scaler.pkl', 'feature_names.pkl']:
    size = os.path.getsize(os.path.join(MODELS_DIR, fname))
    print(f"  {fname} — {size/1024:.1f} KB")

# ── Step 11: Sanity checks ────────────────────────────────────────────────
print("\n=== SANITY CHECK ===")
checks = [
    ("NORMAL  500 known 2PM",
     {'amount': 500,   'amount_to_avg_ratio': 0.9,  'amount_to_max_ratio': 0.7,
      'amount_to_balance_ratio': 0.005, 'velocity_2min': 0, 'velocity_1hr': 1,
      'is_known_beneficiary': 1, 'is_new_location': 0, 'transaction_hour': 14,
      'days_since_last_txn': 1, 'balance_drain': 0, 'exceeds_balance': 0}, "LOW"),

    ("DRAIN   95k 19x balance=0",
     {'amount': 95000, 'amount_to_avg_ratio': 19.0, 'amount_to_max_ratio': 15.0,
      'amount_to_balance_ratio': 0.95, 'velocity_2min': 0, 'velocity_1hr': 0,
      'is_known_beneficiary': 0, 'is_new_location': 0, 'transaction_hour': 3,
      'days_since_last_txn': 30, 'balance_drain': 1, 'exceeds_balance': 0}, "HIGH"),

    ("VELOCITY 4/2min",
     {'amount': 1000,  'amount_to_avg_ratio': 2.0, 'amount_to_max_ratio': 1.0,
      'amount_to_balance_ratio': 0.01, 'velocity_2min': 4, 'velocity_1hr': 6,
      'is_known_beneficiary': 0, 'is_new_location': 0, 'transaction_hour': 14,
      'days_since_last_txn': 1, 'balance_drain': 0, 'exceeds_balance': 0}, "HIGH"),

    ("LARGE   50k 10x new benef",
     {'amount': 50000, 'amount_to_avg_ratio': 10.0, 'amount_to_max_ratio': 8.0,
      'amount_to_balance_ratio': 0.5, 'velocity_2min': 0, 'velocity_1hr': 0,
      'is_known_beneficiary': 0, 'is_new_location': 0, 'transaction_hour': 14,
      'days_since_last_txn': 30, 'balance_drain': 0, 'exceeds_balance': 0}, "HIGH"),
]

all_pass = True
for label, feats, expected in checks:
    row   = pd.DataFrame([feats])[FEATURE_NAMES]
    row_s = pd.DataFrame(scaler.transform(row), columns=FEATURE_NAMES)
    prob  = float(model.predict_proba(row_s)[0][1])
    actual = "HIGH" if prob >= 0.7 else "MEDIUM" if prob >= 0.4 else "LOW"
    ok     = actual == expected
    if not ok: all_pass = False
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] [{actual:6}] prob={prob:.4f}  {label}  (expected {expected})")

print()
if all_pass:
    print("All sanity checks PASSED")
else:
    print("Some checks FAILED — rule engine in transactionController.js handles edge cases")
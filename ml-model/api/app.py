from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, numpy as np, os, pandas as pd, warnings

# ── Suppress non-breaking pickle version warnings ──────────────────────────
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=".*InconsistentVersionWarning.*")
os.environ["PYTHONWARNINGS"] = "ignore"

app = Flask(__name__)
CORS(app)

# Fix 20: shared-secret API key auth guard
ML_API_KEY = os.environ.get("ML_API_KEY", "")

def _check_api_key():
    """Return a 401 Response if ML_API_KEY is configured and not matched."""
    if ML_API_KEY and request.headers.get("X-ML-API-Key") != ML_API_KEY:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    return None

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, '..', 'models')

try:
    model         = joblib.load(os.path.join(MODELS_DIR, 'fraud_model.pkl'))
    feature_names = joblib.load(os.path.join(MODELS_DIR, 'feature_names.pkl'))
    scaler        = joblib.load(os.path.join(MODELS_DIR, 'scaler.pkl'))
    print(f"[OK] Model loaded -- expects {len(feature_names)} features")
    print(f"     Features: {feature_names}")
except Exception as e:
    print(f"[ERROR] Error loading models: {e}")
    model = None
    feature_names = []
    scaler = None

# ── Risk mapping ───────────────────────────────────────────────────────────
def get_risk(prob):
    if prob >= 0.7:
        return {'risk_level': 'HIGH',   'flag': 'RED',   'action': 'BLOCK',   'message': 'Transaction blocked — fraud detected'}
    elif prob >= 0.4:
        return {'risk_level': 'MEDIUM', 'flag': 'AMBER', 'action': 'OTP',     'message': 'Suspicious — OTP verification required'}
    else:
        return {'risk_level': 'LOW',    'flag': 'GREEN', 'action': 'APPROVE', 'message': 'Transaction approved'}

# ── Attack type classification ─────────────────────────────────────────────
def get_attack_type(data, prob):
    if prob < 0.4:
        return 'NONE'
    if data.get('velocity_2min', 0) >= 3:
        return 'RAPID_SUCCESSION_FRAUD'
    if data.get('balance_drain', 0) == 1 or data.get('exceeds_balance', 0) == 1:
        if not data.get('is_known_beneficiary', 1):
            return 'ACCOUNT_TAKEOVER'
        return 'LARGE_AMOUNT_FRAUD'
    if data.get('amount_to_avg_ratio', 1.0) >= 8.0:
        return 'LARGE_AMOUNT_FRAUD'
    hour = data.get('transaction_hour', 12)
    if 1 <= hour <= 5:
        return 'ODD_HOUR_FRAUD'
    if data.get('is_new_location', 0) and not data.get('is_known_beneficiary', 1):
        return 'ACCOUNT_TAKEOVER'
    if not data.get('is_known_beneficiary', 1):
        return 'NEW_BENEFICIARY_FRAUD'
    return 'PATTERN_ANOMALY'

# ── Human-readable reason builder ──────────────────────────────────────────
FEATURE_LABELS = {
    'amount':                  ('amount',              'your transaction amount'),
    'amount_to_avg_ratio':     ('amount_to_avg_ratio', 'your average transaction amount'),
    'amount_to_max_ratio':     ('amount_to_max_ratio', 'your maximum transaction amount'),
    'amount_to_balance_ratio': ('amount_to_balance_ratio', 'your account balance'),
    'velocity_2min':           ('velocity_2min',       'transactions in the last 2 minutes'),
    'velocity_1hr':            ('velocity_1hr',        'transactions in the last hour'),
    'is_known_beneficiary':    ('is_known_beneficiary','recipient familiarity'),
    'is_new_location':         ('is_new_location',     'transaction location'),
    'transaction_hour':        ('transaction_hour',    'time of transaction'),
    'days_since_last_txn':     ('days_since_last_txn', 'days since last transaction'),
    'balance_drain':           ('balance_drain',       'balance drain level'),
    'exceeds_balance':         ('exceeds_balance',     'balance limit'),
}

def make_reason(feature, shap_val, input_dict):
    val = input_dict.get(feature, 0)
    direction = "raised" if shap_val > 0 else "lowered"

    if feature == 'amount_to_avg_ratio':
        ratio = round(val, 1)
        return f"Amount is {ratio}x your usual average — unusual spending spike"
    if feature == 'amount_to_max_ratio':
        ratio = round(val, 1)
        return f"Amount is {ratio}x your historical maximum transaction"
    if feature == 'amount_to_balance_ratio':
        pct = round(val * 100, 1)
        return f"This transaction is {pct}% of your total balance"
    if feature == 'velocity_2min':
        return f"{int(val)} transactions detected in the last 2 minutes — rapid succession pattern"
    if feature == 'velocity_1hr':
        return f"{int(val)} transactions in the past hour — above normal frequency"
    if feature == 'is_known_beneficiary':
        return "Recipient is not in your known contacts list"
    if feature == 'is_new_location':
        return "Transaction originated from an unfamiliar location"
    if feature == 'transaction_hour':
        return f"Transaction at hour {int(val)} — outside your usual activity window"
    if feature == 'days_since_last_txn':
        return f"{int(val)} days since your last transaction — unusual account activity"
    if feature == 'balance_drain':
        return "This transaction would drain a significant portion of your balance"
    if feature == 'exceeds_balance':
        return "Transaction amount exceeds available balance"
    if feature == 'amount':
        return f"Transaction amount of ₹{int(val):,} is significantly above your norm"
    return f"{FEATURE_LABELS.get(feature, (feature,))[0]} {direction} the risk score"

# ── Health check ───────────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok' if model else 'error',
        'features': feature_names,
        'model_loaded': model is not None,
    })

# ── Predict ────────────────────────────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
    auth_err = _check_api_key()  # Fix 20
    if auth_err:
        return auth_err
    if not model:
        return jsonify({'success': False, 'error': 'Model not loaded'}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data received'}), 400

        # Build input matching the 12 trained features in exact order
        input_dict = {
            'amount':                  float(data.get('amount', 0)),
            'amount_to_avg_ratio':     float(data.get('amount_to_avg_ratio', 1.0)),
            'amount_to_max_ratio':     float(data.get('amount_to_max_ratio', 1.0)),
            'amount_to_balance_ratio': float(data.get('amount_to_balance_ratio', 0.5)),
            'velocity_2min':           float(data.get('velocity_2min', 0)),
            'velocity_1hr':            float(data.get('velocity_1hr', 0)),
            'is_known_beneficiary':    float(data.get('is_known_beneficiary', 1)),
            'is_new_location':         float(data.get('is_new_location', 0)),
            'transaction_hour':        float(data.get('transaction_hour', 12)),
            'days_since_last_txn':     float(data.get('days_since_last_txn', 0)),
            'balance_drain':           float(data.get('balance_drain', 0)),
            'exceeds_balance':         float(data.get('exceeds_balance', 0)),
        }

        # Build DataFrame in exact feature order the model was trained on
        input_df     = pd.DataFrame([input_dict])[feature_names]
        input_scaled = scaler.transform(input_df)

        prediction   = int(model.predict(input_scaled)[0])
        probability  = round(float(model.predict_proba(input_scaled)[0][1]), 4)

        risk         = get_risk(probability)
        attack_type  = get_attack_type(data, probability)

        print(
            f"PREDICT | amt={data.get('amount')} "
            f"avgRatio={data.get('amount_to_avg_ratio', 1.0):.1f}x "
            f"vel2m={data.get('velocity_2min', 0)} "
            f"known={data.get('is_known_beneficiary', 1)} "
            f"newLoc={data.get('is_new_location', 0)} "
            f"hr={data.get('transaction_hour', 12)} "
            f"drain={data.get('balance_drain', 0)} "
            f"=> prob={probability} risk={risk['risk_level']} attack={attack_type}"
        )

        return jsonify({
            'success':     True,
            'is_fraud':    prediction == 1,
            'probability': probability,
            'confidence':  round(probability * 100, 2),
            'risk_level':  risk['risk_level'],
            'flag':        risk['flag'],
            'action':      risk['action'],
            'message':     risk['message'],
            'attack_type': attack_type,
        })

    except Exception as e:
        import traceback
        print(f"Predict error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ── FEATURE 1: SHAP Explainability ────────────────────────────────────────
@app.route('/explain', methods=['POST'])
def explain():
    auth_err = _check_api_key()  # Fix 20
    if auth_err:
        return auth_err
    if not model:
        return jsonify({'success': False, 'error': 'Model not loaded'}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data received'}), 400

        input_dict = {
            'amount':                  float(data.get('amount', 0)),
            'amount_to_avg_ratio':     float(data.get('amount_to_avg_ratio', 1.0)),
            'amount_to_max_ratio':     float(data.get('amount_to_max_ratio', 1.0)),
            'amount_to_balance_ratio': float(data.get('amount_to_balance_ratio', 0.5)),
            'velocity_2min':           float(data.get('velocity_2min', 0)),
            'velocity_1hr':            float(data.get('velocity_1hr', 0)),
            'is_known_beneficiary':    float(data.get('is_known_beneficiary', 1)),
            'is_new_location':         float(data.get('is_new_location', 0)),
            'transaction_hour':        float(data.get('transaction_hour', 12)),
            'days_since_last_txn':     float(data.get('days_since_last_txn', 0)),
            'balance_drain':           float(data.get('balance_drain', 0)),
            'exceeds_balance':         float(data.get('exceeds_balance', 0)),
        }

        input_df     = pd.DataFrame([input_dict])[feature_names]
        input_scaled = scaler.transform(input_df)

        # Try SHAP first, fall back to feature importance
        explanations = []
        try:
            import shap
            explainer   = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(input_scaled)

            # For binary classifiers shap_values may be list[2] or ndarray
            if isinstance(shap_values, list):
                sv = shap_values[1][0]
            else:
                sv = shap_values[0]

            # Pair features with shap values, sort by |impact|
            pairs = list(zip(feature_names, sv, input_df.iloc[0].values))
            pairs.sort(key=lambda x: abs(x[1]), reverse=True)

            for feat, shap_val, raw_val in pairs[:3]:
                if abs(shap_val) < 0.001:
                    continue
                reason = make_reason(feat, shap_val, input_dict)
                explanations.append({
                    'feature':   feat,
                    'impact':    round(float(shap_val), 4),
                    'direction': 'increased_risk' if shap_val > 0 else 'decreased_risk',
                    'reason':    reason,
                })

        except ImportError:
            # SHAP not installed — use feature importances from the model
            importances = model.feature_importances_
            pairs = list(zip(feature_names, importances, input_df.iloc[0].values))
            pairs.sort(key=lambda x: x[1], reverse=True)
            for feat, imp, raw_val in pairs[:3]:
                reason = make_reason(feat, imp, input_dict)
                explanations.append({
                    'feature':   feat,
                    'impact':    round(float(imp), 4),
                    'direction': 'increased_risk',
                    'reason':    reason,
                })

        # Ensure we always return at least 1 explanation
        if not explanations:
            explanations = [{
                'feature':   'pattern',
                'impact':    0,
                'direction': 'increased_risk',
                'reason':    'Multiple behavioral signals contributed to the risk score',
            }]

        return jsonify({'success': True, 'explanations': explanations[:3]})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("\nStarting BankGuard ML API — Behavioral XGBoost")
    print("  Health  : http://localhost:5000/health")
    print("  Predict : http://localhost:5000/predict")
    print("  Explain : http://localhost:5000/explain\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
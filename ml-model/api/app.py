from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, numpy as np, os, pandas as pd, warnings

# ── Suppress non-breaking pickle version warnings ──────────────────────────
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=".*InconsistentVersionWarning.*")
os.environ["PYTHONWARNINGS"] = "ignore"

app = Flask(__name__)
CORS(app)

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

if __name__ == '__main__':
    print("\nStarting BankGuard ML API — Behavioral XGBoost")
    print("  Health  : http://localhost:5000/health")
    print("  Predict : http://localhost:5000/predict\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
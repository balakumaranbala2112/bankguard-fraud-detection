from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

# --------------------------------------------------------
# Step 1 — Load all 3 model files when Flask starts
# --------------------------------------------------------
print("Loading model files...")

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR   = os.path.join(BASE_DIR, '..', 'models')

model         = joblib.load(os.path.join(MODELS_DIR, 'fraud_model.pkl'))
scaler        = joblib.load(os.path.join(MODELS_DIR, 'scaler.pkl'))
feature_names = joblib.load(os.path.join(MODELS_DIR, 'feature_names.pkl'))

print("fraud_model.pkl  loaded")
print("scaler.pkl       loaded")
print("feature_names.pkl loaded")
print(f"Model expects {len(feature_names)} features")
print("Flask is ready to accept requests")

# --------------------------------------------------------
# Step 2 — Pre-scale Amount and Time ONCE per request
# --------------------------------------------------------
def scale_amount_and_time(raw_amount, raw_time):
    """
    Scale Amount only using the saved scaler (fitted on 1 feature).
    Time_Scaled is just a normalized version of raw_time.
    """
    scaled_amount = scaler.transform([[raw_amount]])[0][0]

    # Time is typically normalized by dividing by max seconds in 2 days (172800)
    scaled_time = raw_time / 172800.0

    return scaled_amount, scaled_time


# --------------------------------------------------------
# Step 3 — Helper function to map probability to risk level
# --------------------------------------------------------
def get_risk_level(probability):
    if probability >= 0.7:
        return {
            'risk_level' : 'HIGH',
            'flag'       : 'RED',
            'action'     : 'BLOCK',
            'message'    : 'Transaction blocked — fraud detected'
        }
    elif probability >= 0.4:
        return {
            'risk_level' : 'MEDIUM',
            'flag'       : 'AMBER',
            'action'     : 'OTP',
            'message'    : 'Suspicious transaction — OTP verification required'
        }
    else:
        return {
            'risk_level' : 'LOW',
            'flag'       : 'GREEN',
            'action'     : 'APPROVE',
            'message'    : 'Transaction approved'
        }


# --------------------------------------------------------
# Step 4 — Map attack type based on fraud patterns
# --------------------------------------------------------
def get_attack_type(data, probability):
    if probability < 0.4:
        return 'NONE'

    amount             = data.get('Amount', 0)
    is_new_location    = data.get('is_new_location', False)
    is_new_beneficiary = data.get('is_new_beneficiary', False)
    hour               = data.get('transaction_hour', 12)
    frequency          = data.get('transaction_frequency', 1)

    if amount > 10000:
        return 'LARGE_AMOUNT_FRAUD'
    elif is_new_location and is_new_beneficiary:
        return 'ACCOUNT_TAKEOVER'
    elif frequency > 5:
        return 'RAPID_SUCCESSION_FRAUD'
    elif 1 <= hour <= 4:
        return 'ODD_HOUR_FRAUD'
    elif is_new_beneficiary:
        return 'NEW_BENEFICIARY_FRAUD'
    else:
        return 'PATTERN_ANOMALY'


# --------------------------------------------------------
# Route 1 — Health check
# --------------------------------------------------------
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status'        : 'ok',
        'message'       : 'BankGuard ML API is running',
        'model_loaded'  : True,
        'features_count': len(feature_names)
    })


# --------------------------------------------------------
# Route 2 — Main prediction endpoint
# --------------------------------------------------------
@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Step A — Get data from Node.js request
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error'  : 'No data received'
            }), 400

        # Step B — Pre-scale Amount and Time ONCE together
        raw_amount = float(data.get('Amount', 0))
        raw_time   = float(data.get('Time', 0))
        scaled_amount, scaled_time = scale_amount_and_time(raw_amount, raw_time)

        # Step C — Build feature array in the exact order the model expects
        feature_values = []

        for feature in feature_names:
            if feature == 'Amount_Scaled':
                feature_values.append(scaled_amount)

            elif feature == 'Time_Scaled':
                feature_values.append(scaled_time)

            else:
                # V1–V28 features: use directly (0 if not provided)
                feature_values.append(float(data.get(feature, 0)))

        # Step D — Convert to numpy array and predict
        input_array = np.array(feature_values).reshape(1, -1)

        prediction  = model.predict(input_array)[0]
        probability = model.predict_proba(input_array)[0][1]
        probability = round(float(probability), 4)

        # Step E — Get risk level and attack type
        risk        = get_risk_level(probability)
        attack_type = get_attack_type(data, probability)

        # Step F — Build and return response
        response = {
            'success'     : True,
            'is_fraud'    : bool(prediction == 1),
            'probability' : probability,
            'confidence'  : round(probability * 100, 2),
            'risk_level'  : risk['risk_level'],
            'flag'        : risk['flag'],
            'action'      : risk['action'],
            'message'     : risk['message'],
            'attack_type' : attack_type
        }

        print(f"Prediction: {risk['risk_level']} | "
              f"Probability: {probability} | "
              f"Attack: {attack_type}")

        return jsonify(response)

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'success': False,
            'error'  : str(e)
        }), 500


# --------------------------------------------------------
# Route 3 — Test route with dummy data
# --------------------------------------------------------
@app.route('/test', methods=['GET'])
def test():
    # FIX: use the corrected scale_amount_and_time helper here too
    scaled_amount, scaled_time = scale_amount_and_time(500.0, 1000.0)

    feature_values = []
    for feature in feature_names:
        if feature == 'Amount_Scaled':
            feature_values.append(scaled_amount)
        elif feature == 'Time_Scaled':
            feature_values.append(scaled_time)
        else:
            feature_values.append(0.0)

    input_array = np.array(feature_values).reshape(1, -1)
    prediction  = model.predict(input_array)[0]
    probability = round(float(model.predict_proba(input_array)[0][1]), 4)
    risk        = get_risk_level(probability)

    return jsonify({
        'test'       : 'passed',
        'prediction' : 'Fraud' if prediction == 1 else 'Normal',
        'probability': probability,
        'risk_level' : risk['risk_level'],
        'flag'       : risk['flag'],
        'action'     : risk['action']
    })


# --------------------------------------------------------
# Start Flask server
# --------------------------------------------------------
if __name__ == '__main__':
    print("\n Starting BankGuard Flask API...")
    print("   Port    : 5000")
    print("   Health  : http://localhost:5000/health")
    print("   Predict : http://localhost:5000/predict")
    print("   Test    : http://localhost:5000/test\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
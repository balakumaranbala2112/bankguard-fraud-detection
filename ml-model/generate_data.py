import pandas as pd
import numpy as np
import os

def generate_synthetic_data(num_samples=5000):
    np.random.seed(42)
    
    # normal transactions
    n_normal = int(num_samples * 0.95)
    
    normal_data = pd.DataFrame({
        'amount': np.random.uniform(100, 20000, n_normal),
        'amount_to_avg_ratio': np.random.uniform(0.1, 2.5, n_normal),
        'amount_to_max_ratio': np.random.uniform(0.01, 0.8, n_normal),
        'amount_to_balance_ratio': np.random.uniform(0.01, 0.5, n_normal),
        'velocity_2min': np.random.randint(0, 3, n_normal),
        'velocity_1hr': np.random.randint(0, 5, n_normal),
        'is_known_beneficiary': np.random.choice([0, 1], n_normal, p=[0.2, 0.8]),
        'is_new_location': np.random.choice([0, 1], n_normal, p=[0.9, 0.1]),
        'transaction_hour': np.random.randint(6, 23, n_normal),
        'days_since_last_txn': np.random.uniform(0.1, 30, n_normal),
        'balance_drain': np.zeros(n_normal),
        'exceeds_balance': np.zeros(n_normal),
        'is_fraud': np.zeros(n_normal)
    })
    
    # fraud transactions
    n_fraud = num_samples - n_normal
    
    fraud_data = pd.DataFrame({
        'amount': np.random.uniform(15000, 100000, n_fraud),
        'amount_to_avg_ratio': np.random.uniform(2.0, 15.0, n_fraud),
        'amount_to_max_ratio': np.random.uniform(0.8, 5.0, n_fraud),
        'amount_to_balance_ratio': np.random.uniform(0.7, 1.5, n_fraud),
        'velocity_2min': np.random.randint(2, 10, n_fraud),
        'velocity_1hr': np.random.randint(3, 20, n_fraud),
        'is_known_beneficiary': np.random.choice([0, 1], n_fraud, p=[0.9, 0.1]),
        'is_new_location': np.random.choice([0, 1], n_fraud, p=[0.1, 0.9]),
        'transaction_hour': np.random.choice(
            [np.random.randint(0, 6) if np.random.random() < 0.7 else np.random.randint(23, 24) for _ in range(n_fraud)]
        ),
        'days_since_last_txn': np.random.uniform(0, 5, n_fraud),
        'balance_drain': np.random.choice([0, 1], n_fraud, p=[0.2, 0.8]),
        'exceeds_balance': np.random.choice([0, 1], n_fraud, p=[0.7, 0.3]),
        'is_fraud': np.ones(n_fraud)
    })
    
    df = pd.concat([normal_data, fraud_data], ignore_index=True)
    
    # shuffle
    df = df.sample(frac=1).reset_index(drop=True)
    
    os.makedirs('data', exist_ok=True)
    output_path = os.path.join('data', 'bankguard_data.csv')
    df.to_csv(output_path, index=False)
    print(f"Generated {num_samples} rows of synthetic training data at {output_path}")

if __name__ == "__main__":
    generate_synthetic_data(5000)

#!/usr/bin/env python3
"""Run this after git pull to retrain the tree pose model."""
import sys, os, numpy as np, pickle
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exercise_correction.settings')
import django; django.setup()

from api.views import build_feature_row
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score

BASE = os.path.dirname(__file__)
fake = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 0.9} for _ in range(33)]
n_features = len(build_feature_row("tree_pose", fake))
print(f"Feature count: {n_features}")

def load_csv(path):
    data = np.genfromtxt(path, delimiter=',', skip_header=1, dtype=str)
    return data[:, :n_features].astype(float), data[:, -1]

X_train, y_train = load_csv(f'{BASE}/train.csv')
X_test,  y_test  = load_csv(f'{BASE}/test.csv')
scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
model = LogisticRegression(max_iter=1000, random_state=42)
model.fit(X_train_sc, y_train)
acc = accuracy_score(y_test, model.predict(scaler.transform(X_test)))
print(f"Accuracy: {acc*100:.2f}%")

model_dir = f'{BASE}/static/model'
with open(f'{model_dir}/tree_pose_model.pkl', 'wb') as f: pickle.dump(model, f)
with open(f'{model_dir}/tree_pose_input_scaler.pkl', 'wb') as f: pickle.dump(scaler, f)
print("✅ Tree pose model saved!")

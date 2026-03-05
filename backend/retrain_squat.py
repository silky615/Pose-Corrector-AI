"""
retrain_squat.py
================
Retrains the squat stage model (up/down) using your existing training CSV
and saves a fresh squat_model.pkl compatible with your current environment.

USAGE (run from inside your server directory with venv activated):
    cd /Users/perk/Desktop/MSSC/Capstone/Exercise-Correction/web/server
    source venv/bin/activate
    python retrain_squat.py

WHAT IT DOES:
    1. Loads train.csv from the squat_model folder
    2. Trains a Decision Tree classifier (same type as original model)
    3. Saves squat_model.pkl to static/model/  (overwrites old broken one)
    4. Verifies the new model loads correctly
"""

import os
import sys
import pickle
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# ── Paths ──────────────────────────────────────────────────────────────────
TRAIN_CSV = "/Users/perk/Desktop/MSSC/Capstone/Exercise-Correction/core/squat_model/train.csv"
TEST_CSV  = "/Users/perk/Desktop/MSSC/Capstone/Exercise-Correction/core/squat_model/test.csv"
OUTPUT_PKL = os.path.join(os.path.dirname(__file__), "static", "model", "squat_model.pkl")

# ── Feature columns (must match views.py SQUAT_IMPORTANT_LANDMARKS × 4) ───
SQUAT_IMPORTANT_LANDMARKS = [
    "NOSE",
    "LEFT_SHOULDER",
    "RIGHT_SHOULDER",
    "LEFT_HIP",
    "RIGHT_HIP",
    "LEFT_KNEE",
    "RIGHT_KNEE",
    "LEFT_ANKLE",
    "RIGHT_ANKLE",
]
FEATURE_COLS = []
for lm in SQUAT_IMPORTANT_LANDMARKS:
    FEATURE_COLS += [
        f"{lm.lower()}_x",
        f"{lm.lower()}_y",
        f"{lm.lower()}_z",
        f"{lm.lower()}_v",
    ]
LABEL_COL = "label"   # expected column name in CSV — will auto-detect if different

# ───────────────────────────────────────────────────────────────────────────

def banner(msg):
    print(f"\n{'='*55}")
    print(f"  {msg}")
    print(f"{'='*55}")


def load_csv(path, label="data"):
    if not os.path.exists(path):
        print(f"[ERROR] {label} CSV not found at:\n  {path}")
        sys.exit(1)
    df = pd.read_csv(path)
    print(f"[OK] Loaded {label}: {len(df)} rows, columns: {list(df.columns[:6])} ...")
    return df


def detect_label_col(df):
    """Find the label/target column automatically."""
    for candidate in ["label", "class", "target", "stage", "pose"]:
        if candidate in df.columns:
            return candidate
    # Last column is usually the label
    last = df.columns[-1]
    print(f"[WARN] Could not find standard label column. Using last column: '{last}'")
    return last


def check_feature_cols(df, feature_cols, label_col):
    """Verify expected features exist; fall back gracefully if not."""
    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        print(f"[WARN] {len(missing)} expected feature columns not found in CSV.")
        print(f"       Missing: {missing[:5]}{'...' if len(missing)>5 else ''}")
        print(f"[INFO] Using all numeric columns except '{label_col}' as features.")
        available = [c for c in df.columns if c != label_col and pd.api.types.is_numeric_dtype(df[c])]
        return available
    return feature_cols


def main():
    banner("Squat Model Retrainer")
    print(f"  Python  : {sys.version.split()[0]}")
    print(f"  NumPy   : {np.__version__}")
    import sklearn
    print(f"  sklearn : {sklearn.__version__}")
    print(f"  Train CSV : {TRAIN_CSV}")
    print(f"  Output PKL: {OUTPUT_PKL}")

    # ── 1. Load data ───────────────────────────────────────────────────────
    banner("Step 1: Loading training data")
    train_df = load_csv(TRAIN_CSV, "train")

    label_col = detect_label_col(train_df)
    print(f"[OK] Label column: '{label_col}'")
    print(f"[OK] Classes found: {sorted(train_df[label_col].unique())}")

    feature_cols = check_feature_cols(train_df, FEATURE_COLS, label_col)
    print(f"[OK] Using {len(feature_cols)} feature columns")

    X_train = train_df[feature_cols].values
    y_train = train_df[label_col].values

    # ── 2. Load test data if available ────────────────────────────────────
    banner("Step 2: Loading test data")
    if os.path.exists(TEST_CSV):
        test_df = load_csv(TEST_CSV, "test")
        test_feature_cols = check_feature_cols(test_df, FEATURE_COLS, label_col)
        X_test = test_df[test_feature_cols].values
        y_test = test_df[label_col].values
    else:
        print("[WARN] test.csv not found — splitting train data 80/20 for evaluation.")
        X_train, X_test, y_train, y_test = train_test_split(
            X_train, y_train, test_size=0.2, random_state=42, stratify=y_train
        )

    # ── 3. Train ───────────────────────────────────────────────────────────
    banner("Step 3: Training Decision Tree classifier")
    print("  (Same model type as original squat_model.pkl)")
    model = DecisionTreeClassifier(
        criterion="gini",
        max_depth=None,       # matches typical sklearn default training
        random_state=42,
    )
    model.fit(X_train, y_train)
    print("[OK] Training complete.")

    # ── 4. Evaluate ────────────────────────────────────────────────────────
    banner("Step 4: Evaluation")
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Accuracy : {acc * 100:.2f}%")
    print()
    print(classification_report(y_test, y_pred))

    if acc < 0.80:
        print("[WARN] Accuracy below 80%. Model may not perform well.")
        print("       Check that your CSV label column is correct.")
    else:
        print("[OK] Accuracy looks good!")

    # ── 5. Save ────────────────────────────────────────────────────────────
    banner("Step 5: Saving model")
    os.makedirs(os.path.dirname(OUTPUT_PKL), exist_ok=True)
    with open(OUTPUT_PKL, "wb") as f:
        pickle.dump(model, f)
    print(f"[OK] Saved: {OUTPUT_PKL}")

    # ── 6. Verify the saved model loads back correctly ─────────────────────
    banner("Step 6: Verifying saved model")
    with open(OUTPUT_PKL, "rb") as f:
        loaded = pickle.load(f)
    sample = X_test[:3]
    preds  = loaded.predict(sample)
    probas = loaded.predict_proba(sample)
    print(f"[OK] Model reloads successfully: {type(loaded).__name__}")
    print(f"[OK] Sample predictions : {preds}")
    print(f"[OK] Sample probabilities: {probas.round(2)}")
    print(f"[OK] Classes: {loaded.classes_}")

    banner("DONE — Next steps")
    print("  1. Restart your Django server:  python manage.py runserver")
    print("  2. Visit: http://localhost:8000/api/video/health")
    print("  3. squat_model should now show: OK (DecisionTreeClassifier)")
    print()


if __name__ == "__main__":
    main()

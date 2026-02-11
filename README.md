# Pose-Corrector-AI  
AI-powered exercise form correction system using pose estimation and machine learning models.

This project uses **MediaPipe pose detection** and **ML classifiers** to analyze exercise form and provide feedback on common home workouts. The goal is to help users perform exercises safely and correctly by identifying incorrect posture or movement patterns.

---

## Project Intro

We are building an AI-based system that can analyze uploaded workout videos and classify whether the user is performing an exercise with proper form.

The project focuses on **five exercises**:

- **Bicep Curl**
- **Plank**
- **Squat**
- **Lunge**
- **Shoulder Press** *(or another 5th exercise finalized by the team)*

Each exercise will have its own machine learning model trained to detect common form mistakes and provide corrective feedback.

A simple **web application** will allow users to upload videos and receive form analysis results.

---

## How It Works (High-Level Overview)

1. User uploads a workout video  
2. MediaPipe extracts pose keypoints  
3. Keypoints are converted into angles/features  
4. ML model classifies the form (Correct / Incorrect types)  
5. Web app displays feedback and improvement suggestions  

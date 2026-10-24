# ML Model Serving Lifecycle

When serving machine learning models (scikit-learn, joblib, PyTorch, ONNX) in web endpoints:
- **Never** deserialize or reload model files inside per-request route handlers or loop bodies.
- Always implement a module-level lazy singleton (`get_model()`) to load weights into RAM exactly once per process.
- In Windows environments, monitor working set memory to prevent virtual memory commit exhaustion (`The paging file is too small for this operation to complete`).

# ADR-002: Independent AI Model Deployment on Hugging Face

## Context
Ryvix requires an advanced LLM reasoning engine for software planning, code diff generation, tool selection, and incident forensics. The intelligence layer must remain modular, independently scalable, and decoupled from backend application logic and credentials.

## Decision
Deploy the Ryvix AI model independently on **Hugging Face** (via dedicated Inference Endpoints / Serverless APIs) and interface with it through a standardized gateway in the Ryvix Backend:
- The AI Model is treated as an external stateless reasoning service.
- The model communicates exclusively via structured JSON prompts and function-calling schemas.
- Future fine-tuned Ryvix models will be versioned and deployed as private Hugging Face model repositories.

## Consequences
- **Positive**: Complete decoupling of the model lifecycle from backend deployments; independent autoscaling of GPU infrastructure; seamless swapping between foundation models and fine-tuned checkpoints; strict token budget control.
- **Negative**: Network latency overhead across inference calls (mitigated via streaming tokens and low-latency VPC connections).

## Alternatives Considered
- **Colocating Local LLM inside Backend Nodes**: Rejected due to prohibitive GPU memory requirements, hardware contention, and inability to independently scale web/API pods from compute-heavy inference nodes.
- **Direct Hard-Coding to a Single Proprietary Commercial API**: Rejected to avoid platform lock-in and enable future training and hosting of specialized open-weight Ryvix models.

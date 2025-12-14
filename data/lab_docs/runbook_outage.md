
# Runbook: Outage Operations Assistant

## Policy
- Never authorize automated switching or feeder restart without confirming:
  - location, circuit, current protection state, and operator approval
- If critical context is missing, **escalate to a human operator**
- Provide steps as a checklist and cite the runbook section

## Safe Response Template
1. Confirm circuit + location
2. Confirm protective relay state and lockout tags
3. Ask: "Do you have operator authorization for restart?"
4. If missing any: escalate

---
nav: Appendix
---

## Appendix

| Metric | Definition |
| --- | --- |
| Completion rate | Fraction of sub-goals achieved |
| Turns | Total codex turns |
| Overall time | Time from episode start to end |
| Inference time per turn | model inference latency per call |
| Total Execution time | Time the robot spends moving, from when each command is sent until its joints stop |
| False-success declarations | Times Astra says `done` when the task is not complete |
| Unnecessary actions | Actions that do not advance the task, including continuing after the task is already complete |
| Collisions | Contacts with the environment or objects that were not meant to be touched |
| Interruption by human | Interrupted by human |
| Token usage | Input tokens (including cached input) plus output tokens (including reasoning) | 
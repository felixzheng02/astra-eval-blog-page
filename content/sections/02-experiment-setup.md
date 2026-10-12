---
nav: Experiment Setup
---

## Experiment Setup

{% raw %}
<!-- Drop files in media/videos/ or media/images/, then uncomment.

{% video "/media/videos/teaser.mp4", "Caption for a local mp4" %}

{% youtube "xxxxxxxxxxx", "Same clip on YouTube" %}

{% vimeo "000000000", "Same clip on Vimeo" %}
-->

### Robot and environment
Introduce the Hello Robot Stretch 4 and the lab’s household environment. Describe the relevant hardware, sensor placement, and spaces used for evaluation, accompanied by a setup photo.

### Observation and action interface
Describe what Astra receives at each decision step, including camera views, robot state, and any additional information. Define the relative joint and base commands it produces, their units and limits, and whether each response contains one action or a sequence.

### Control loop
Explain how observations, model inference, execution, and feedback form a closed loop. Clarify which decisions Astra makes and which functions the supporting software handles, including preprocessing, motion execution, command validation, and safety checks.

### Model configuration and zero-shot setting
Specify the model, reasoning settings, Codex configuration, and information supplied through the prompt or tools. Explain how context is maintained within a trial and reset between trials, and define the conditions under which you describe the evaluation as zero-shot.

### Tasks and evaluation protocol
Introduce the task categories, starting conditions, and number of trials. Define success, stopping conditions, and treatment of human interventions. Describe the metrics—including success rate, completion time, and failure recovery—and establish the default configuration used throughout the evaluation and as the reference for ablations.

{% endraw %}

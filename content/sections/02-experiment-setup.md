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

In the default configuration, Astra receives RGB images from the gripper and head-center cameras, the robot's joint state, and the result of the previous command. It returns one relative joint or base movement per turn. Some experiments additionally provide a colorized depth image from the gripper camera or use action chunking, as described in [Case Study & Ablations](#case-study-ablations).

During development, we revised the action schema to use movement-oriented names such as `forward` and `slide` in place of coordinate-style names such as `base_x` and `base_y`. We also asked Astra to explain its intended movements. Comparing those explanations with its commands helped us identify axis and sign errors; the [action-interface case study](#debugging-the-action-interface) describes this change.

<!-- TODO: Add the exact command fields, units, coordinate frame, positive directions, and limits from the implemented schema. -->

### Control loop

The loop alternates between observation, model inference, and execution. Astra selects the movement, the executor carries it out, and fresh observations and execution feedback inform the next model turn. We added a safety guard that reverses an action when a joint's force threshold is exceeded. The controller triggers this response independently of Astra's next decision.

<!-- TODO: Specify the guard's monitored signal, thresholds, reversal behavior, and which recorded episodes used it. -->

### Model configuration and zero-shot setting
Specify the model, reasoning settings, Codex configuration, and information supplied through the prompt or tools. Explain how context is maintained within a trial and reset between trials, and define the conditions under which you describe the evaluation as zero-shot.

### Tasks and evaluation protocol
Introduce the task categories, starting conditions, and number of trials. Define success, stopping conditions, and treatment of human interventions. Describe the metrics—including success rate, completion time, and failure recovery—and establish the default configuration used throughout the evaluation and as the reference for ablations.

{% endraw %}

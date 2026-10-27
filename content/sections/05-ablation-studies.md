---
nav: Ablation Studies
---

## Ablation Studies

{% raw %}
<!-- Extra setup notes, extra rollouts, hardware tables.

### Hardware

| Item | Details |
| --- | --- |
| Robot |  |
| Cameras |  |
-->

{% endraw %}

We conduct ablation studies to assess how different components affect Astra’s autonomous control in executing a representative household task: toasting a bagel.

### Experiment setup

**Instruction:** `put the bread in the oven and rotate the top knob to 300 deg`

**Time limit:** 18 minutes

**Task Decomposition:** To complete the instruction, Astra must accomplish the following five sub-goals in sequence:
1. Open the oven lid
2. Pick up the bread from the dish on the table
3. Place the bread in the oven
4. Close the lid
5. Rotate the knob to the 300 mark

{% video "/media/videos/case-study.mp4", "Demonstration of a successful rollout using the default configuration." %}

**Ablated Components and Variants:** {% tabref "ablation-settings" %} shows all system components we evaluated. For each ablation, we varied a single system component while keeping all other settings at their default values.

{% table "Default configuration and ablation variants.", "ablation-settings" %}
| Setting                 | Default                                             | Variants Tested                                 |
|-------------------------|-----------------------------------------------------|-------------------------------------------------|
| Reasoning effort        | `high`                                                | `low`, `ultra`                         |
| Wrist depth             | API for Astra to query depths from image coordinates| Color-mapped depth image; no depth                        |
{% endtable %}

**Metrics.** We record the metrics in {% tabref "metrics" %} for each rollout. Per-run results for each ablation are tabulated in the appendix: [reasoning effort](#reasoning-effort) ({% tabref "appendix-reasoning-trials" %}) and [wrist depth](#wrist-depth-results) ({% tabref "appendix-depth-trials" %}).

{% table "Metrics recorded per episode.", "metrics" %}
| Metric | Definition |
| --- | --- |
| Success rate | Fraction of episodes in which all sub-goals are achieved |
| Total episode time | Episode start to end, split into inference (sum of Codex latency over all turns), robot execution (sum over commands of the time from sending the command until the commanded joints stop), and other (the remainder) |
| Total tokens | Input tokens (including cached input) plus output tokens (including reasoning), from the Codex session log |
| Completion rate | Fraction of sub-goals achieved |
| Codex turns | Model calls in the episode |
| Inference time per turn | Codex latency for one turn, from request to reply |
{% endtable %}

### Reasoning level

We evaluated Astra's performance at three reasoning levels: `low`, `high` (default), and `ultra`, comparing task metrics as shown in {% figref "ablation-reasoning" %}. Our main findings are:

- **Lowering the reasoning level from `high` to `low` reduced both the success rate and completion rate.** With `low` reasoning, Astra frequently forgot or omitted important steps, such as closing the lid before setting the oven temperature. In one instance, it dropped the bread onto the robot base, causing the human operator to end the episode.

- **Raising the reasoning level from `high` to `ultra` did not lead to better performance.** Notably, in one `high`-level run, the robot was unable to properly pick up the bread, failed to place it inside the oven, and ultimately caused a severe collision that required human intervention. While such failures were rare, when they did occur, Astra often [struggled to reason about dependencies across steps](#fails-to-reason-about-dependencies-across-steps) and could not recover. In practice, we found that `high` and `ultra` reasoning levels performed similarly.

- Interestingly, adjusting the reasoning level had little impact on inference time or token usage.

In summary, we observed no systematic benefit to increasing reasoning above the default `high` setting, while lowering it degraded performance on this task.

{% plotly "/media/figures/ablation-reasoning.json", "The `low` reasoning level performed worse and required more Codex turns compared to `high` and `ultra`. Increasing the reasoning level from `high` to `ultra` did not yield noticeable differences in any aspect.", "ablation-reasoning" %}

### Wrist depth

We evaluated three configurations for providing wrist depth information: (1) no depth input, (2) a color-mapped depth image, and (3) an API allowing Astra to query depth at specific image coordinates (the default setting). The task metrics are shown in {% figref "ablation-depth" %}, and our main findings are as follows:

- **Omitting depth information resulted in similar overall performance but required more Codex turns, greater total time, and increased token usage.** Without access to depth data, Astra had to estimate distances from RGB images alone, which led to wasted turns, time, and tokens on empty reaching and grasping. However, Astra consistently retried and recovered from these failures, resulting in comparable success and completion rates overall.

- **Providing a color-mapped depth image produced the weakest performance.** Missed grasp and retries were as common as when no depth information was provided, so the duration of the task completion also suffered. We suspect this is because the colorized depth image is not perfectly aligned with the RGB image, unlike the API option where each pixel directly corresponds to a depth value. As a result, the additional information was not only unhelpful but may have distracted Astra and degraded its effectiveness.

{% plotly "/media/figures/ablation-depth.json", "Effect of depth information.", "ablation-depth" %}

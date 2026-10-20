---
nav: Case Study and Ablations
---

## Case Study and Ablations

{% raw %}
<!-- Extra setup notes, extra rollouts, hardware tables.

### Hardware

| Item | Details |
| --- | --- |
| Robot |  |
| Cameras |  |
-->

{% endraw %}

In this section, we provide a detailed case study of Astra autonomously controlling the robot to toast a bagel. To successfully complete the task, the robot must complete five sub-goals:

1. Open the oven lid.
2. Pick up the bread from the dish on the table.
3. Place the bread in the oven.
4. Close the lid.
5. Rotate the knob to the 300 mark.

This task is nontrivial, as it requires Astra to plan a sequence of actions, manipulate articulated objects, precisely place an items within a cluttered space, identify the "300" marker, and carefully rotate a small knob to the correct location.

**Instruction:** `put the bread in the oven and rotate the top knob to 300 deg`. **Time limit:** 13 min.

{% video "/media/videos/case-study.mp4", "Demonstration of a successful rollout using the default configuration." %}

We performed ablation studies on this task to evaluate the impact of various design choices and system components listed in {% tabref "ablation-settings" %}. In each ablation, only the component under investigation is changed, while all others remain at their default values. Note that these are empirical observations from our runs and are not intended to represent statistically significant results.

{% table "Default configuration and ablation variants.", "ablation-settings" %}
| Setting                 | Default                                             | Variants Tested                                 |
|-------------------------|-----------------------------------------------------|-------------------------------------------------|
| Reasoning effort        | `high`                                                | `low`, `ultra`                         |
| Cameras                 | All cameras (head left + head center + head right + wrist) | head center + wrist |
| Wrist depth             | API for Astra to query depths from image coordinates| Color-mapped depth image; no depth                        |
| Proprioception          | On                                                  | Off                                               |
| Execution feedback      | On                                                  | Off                                               |
| Embodiment description  | On                                                  | Off                                             |
{% endtable %}

**Metrics.** We record the metrics in {% tabref "metrics" %} for each rollout. Per-run results for each ablation are tabulated in the appendix: [reasoning effort](#reasoning-effort-results) ({% tabref "appendix-reasoning-trials" %}) and [wrist depth](#wrist-depth-results) ({% tabref "appendix-depth-trials" %}).

{% table "Metrics recorded per episode.", "metrics" %}
| Metric | Definition |
| --- | --- |
| Success | All sub-goals achieved |
| Completion rate | Fraction of sub-goals achieved |
| Codex turns | Model calls in the episode |
| Total time | Episode start to episode end |
| Inference time per turn | Codex latency for one turn, from request to reply |
| Execution time | Sum over commands of the time from sending the command until the commanded joints stop. Commands that move nothing count as 0 |
| False-success declarations | Times Astra returns `done` when the task is not complete |
| Unnecessary actions | Actions that do not advance the task, including continuing after the task is complete |
| Collisions | Contacts with the environment or with objects not meant to be touched |
| Human interventions | Times the operator stopped the episode or physically intervened |
| Token usage | Input tokens (including cached input) plus output tokens (including reasoning), from the Codex session log |
{% endtable %}

- Inference and execution can overlap, so they need not sum to total time.
- Joint motion is sampled at 5 Hz, so each command's execution time is accurate to about 0.2 s.

### Reasoning level

We evaluated Astra's performance at three reasoning levels: `low`, `high` (default), and `ultra`, comparing task metrics as shown in {% figref "ablation-reasoning" %}. Our main findings are:

- Lowering the reasoning level from `high` to `low` reduced both the success rate and completion rate. With `low` reasoning, Astra frequently forgot or omitted important steps, such as closing the lid before setting the oven temperature. In one instance, it dropped the bread onto the robot base, causing the human operator to end the episode.

- Raising the reasoning level from `high` to `ultra` did not lead to better performance. Notably, in one `high`-level run, the robot was unable to properly pick up the bread, failed to place it inside the oven, and ultimately caused a severe collision that required human intervention. While such failures were rare, when they did occur, Astra often [struggled to reason about dependencies across steps](#fails-to-reason-about-dependencies-across-steps) and could not recover. In practice, we found that `high` and `ultra` reasoning levels performed similarly.

- Interestingly, adjusting the reasoning level had little impact on inference time or token usage.

In summary, we observed no systematic benefit to increasing reasoning above the default `high` setting, while lowering it degraded performance on this task.

{% plotly "/media/figures/ablation-reasoning.json", "The `low` reasoning level performed worse and required more Codex turns compared to `high` and `ultra`. Increasing the reasoning level from `high` to `ultra` did not yield noticeable differences in any aspect.", "ablation-reasoning" %}

### Wrist depth

We evaluated three configurations for providing wrist depth information: (1) no depth input, (2) a color-mapped depth image, and (3) an API allowing Astra to query depth at specific image coordinates (the default setting). The task metrics are shown in {% figref "ablation-depth" %}, and our main findings are as follows:

- Omitting depth information resulted in similar overall performance but required more Codex turns, greater total time, and increased token usage. Without access to depth data, Astra had to estimate distances from RGB images alone, which led to wasted turns, time, and tokens on empty reaching and grasping. However, Astra consistently retried and recovered from these failures, resulting in comparable success and completion rates overall.

- Providing a color-mapped depth image produced the weakest performance. Missed grasp and retries were as common as when no depth information was provided, so the duration of the task completion also suffered. We suspect this is because the colorized depth image is not perfectly aligned with the RGB image, unlike the API option where each pixel directly corresponds to a depth value. As a result, the additional information was not only unhelpful but may have distracted Astra and degraded its effectiveness.

{% plotly "/media/figures/ablation-depth.json", "Effect of depth information.", "ablation-depth" %}
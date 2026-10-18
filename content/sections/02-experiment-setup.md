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
{% endraw %}

{% comment "Ankit" %}
move "unless otherwise stated...included in appendix" in the front
{% endcomment %}

### Robot and environment

We use a [Hello Robot Stretch 4](https://hello-robot.com/stretch-4/), a mobile manipulator with 9 degrees of freedom. It has a three-wheel omnidirectional base, a lift that moves the arm along a vertical spine, a horizontally telescoping arm, a three-axis wrist, and a parallel-jaw gripper. Stretch has an RGB-D camera on its wrist, three cameras on its head (a center camera plus two fish-eye cameras on the left and right), and other lidar/ground sensors that were excluded from our experiments. A computer onboard the Stretch handles the lower level control logic while a seperate workstation sends relative movement commands across a wireless network.

The evaluation takes place in a mock apartment environment in our lab. The setup has a kitchen (counter, sink, toaster, fridge, a Keurig coffee maker, drawers, and cabinets), a dining table with chairs, a living area with a sofa, and a play area with toy bins next to a bedroom area with a dresser.

{% comment "Felix" %}
need to take a picture of environment and robot
{% endcomment %}

{% figure "/media/images/env-and-robot.svg", "Overall Astra control loop.", "env-and-robot" %}

### System overview and control loop

{% figref "astra-control-loop" %} illustrates the main control loop. The system operates in a synchronous `observe → inference → execute` loop. At each turn, Astra receives sensory observations, robot proprioception, and previous execution feedback. It may also choose to access wrist depth information via a provided API. Astra then outputs joint-relative position commands, which the robot executes. After execution, updated observations and execution feedback are provided to Astra, and the loop continues.

{% figure "/media/images/astra_control_loop.svg", "Overall Astra control loop.", "astra-control-loop" %}

**Wrist depth API.** We provide Astra an API that takes in a set of coordinates in wrist camera image space and returns the corresponding depths in centimeters in wrist camera frame. During each turn, Astra decides whether or not to use the API, and if so, what coordinates to query.

**Output action.** During each turn, Astra is asked to output either `move`, together with each joint's relative position, or `done`, which indicates task completion. The complete action schema is provided in the appendix.

{% comment "Nima" %}
Be sure to link the appendix above "The complete action schema is provided in the appendix (currently it is commented out)."
{% endcomment %}


{% comment "Ankit" %}
For "timeout" point under execution feedback might be helpful to state what the timeout value is instead of saying: within a certain timeout limit
{% endcomment %}

**Execution feedback.** Each joint can return one of four types of execution feedback:
1. `completed`: The joint reached its target position.
2. `stopped_short`: The joint stopped moving before reaching its target position.
3. `timeout`: The joint continued attempting to move but did not reach its target position within the allotted time.
4. `rejected`: The target position was outside the joint's limits.

### Our implementation

We access Astra (`gpt-6-astra`) through a Codex CLI instance. It retains no information across experiments, but within each episode, its context preserves the sequence of image and text inputs. This allows Astra to refer back to what it has seen or done earlier in that episode.

For every task, we use a uniform system prompt that specifies the overall objective (controlling a Stretch 4 robot to complete the user's task) and outlines the control loop, including its inputs and the required JSON output format. The prompt also includes additional details that may be helpful, such as robot embodiment information and safety guidelines. At the end, the one-sentence task instruction is appended. Importantly, there is no task-specific information, hints, or human priors embedded in our prompt. See the appendix for the full prompt.

**Configurations.** Unless otherwise noted, all results are reported using the default configuration in {% tabref "ablation-settings" %}. Alternative variants are evaluated in [Case Study and Ablations](05-case-study-ablations.md#case-study--ablations).

**Zero-shot claim.** We regard this configuration as genuinely zero-shot: there is no robot-specific training, fine-tuning, demonstrations, in-context examples, or hand-written skills such as a grasp planner, navigation stack, or object detector. The prompt remains identical for every task and contains no task-specific hints; only the task instruction changes, except in cases where we explicitly test prompt variations.

### Tasks and evaluation protocol

Inspired by [Evaluating $\pi_0$ in the Wild](https://penn-pal-lab.github.io/Pi0-Experiment-in-the-Wild/), we adopted a "vibe-checking" approach, improvising tasks rather than relying on a standard benchmark. For each task, we defined success criteria, measured relevant metrics, and documented failure modes. Full experiment logs are included in the appendix.

**Trials.** Given the number of tasks and Astra’s relatively slow inference speed, unless otherwise specified, we performed 5 trials per task. To ensure that an observed capability is both reproducible and not simply due to random chance, we require that the relevant behavior appears in at least 2 out of 5 trials before including it as an illustrative example in [Strengths](03-strengths.md#strengths). This threshold demonstrates that the capability can be reliably elicited across independent runs, supporting its robustness even under limited trial counts.

**Metrics.** We measure metrics including completion rate, inference time, token usage, etc. for each rollout. We include a full list of metrics and results in the appendix.

**Starting conditions.** Because we aim to test Astra in a real household environment, we varied the initial states of the robot and objects within the bounds of a reasonable test case, unless otherwise noted. Detailed starting conditions for each task are included in the appendix.

**Stopping and interventions.** An episode ends when Astra declares `done`, the operator intervenes to prevent potential damage, the model produces an invalid output, or the time limit for the task is reached. We set different timeout thresholds for each task (see appendix for details).
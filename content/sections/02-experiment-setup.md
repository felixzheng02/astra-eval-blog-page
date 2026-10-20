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

### Robot and environment

We use a [Hello Robot Stretch 4](https://hello-robot.com/stretch-4/), a mobile manipulator with 9 degrees of freedom. It has a three-wheel omnidirectional base, a lift that moves the arm along a vertical spine, a horizontally telescoping arm, a three-axis wrist, and a parallel-jaw gripper. Stretch has an RGB-D camera on its wrist, three cameras on its head (a center camera plus two fish-eye cameras on the left and right), and other lidar/ground sensors that were excluded from our experiments. A computer onboard the Stretch handles the lower level control logic while a seperate workstation sends relative movement commands across a wireless network.

The evaluation takes place in a mock apartment environment in our lab. The setup has a kitchen (counter, sink, toaster, fridge, a Keurig coffee maker, drawers, and cabinets), a dining table with chairs, a living area with a sofa, and a play area with toy bins next to a bedroom area with a dresser.

{% figure "/media/images/home-and-robot.png", "Stretch 4 in our lab's household environment.", "home-and-robot" %}

### System overview and control loop

{% figref "astra-control-loop" %} illustrates the main control loop. The system operates in a synchronous `observe → reason & command → execute` loop. At each turn, Astra receives sensory observations, robot joint states, and previous execution feedback. It may also choose to access wrist depth information via a provided API. Astra then outputs joint relative position commands, which the robot executes. After execution, updated observations and execution feedback are provided to Astra, and the loop continues.

{% figure "/media/images/astra_control_loop.svg", "Overall Astra control loop.", "astra-control-loop" %}

**Wrist depth API.** We provide Astra an API that takes in a set of coordinates in wrist camera image space and returns the corresponding depths in centimeters in wrist camera frame. During each turn, Astra decides whether or not to use the API, and if so, what coordinates to query.

**Model output.** During each turn, Astra is asked to either output each joint's relative position command or decide to finish the task. The complete [action schema](#action-schema) is provided in the appendix.

**Execution feedback.** Each joint can return one of four types of execution feedback:
1. `completed`: The joint reached its target position.
2. `stopped_short`: The joint stopped moving before reaching its target position.
3. `timeout`: The joint continued attempting to move but did not reach its target position within the allotted time.
4. `rejected`: The target position was outside the joint's limits.

### Our implementation

We access Astra (`gpt-6-astra`) through a Codex CLI instance. It retains no information across experiments, but within each episode, its context preserves the sequence of image and text inputs. This allows Astra to refer back to what it has seen or done earlier in that episode.

For every task, we use a uniform system prompt that specifies the overall objective (controlling a Stretch 4 robot to complete the user's task) and outlines the control loop, including its inputs and the required JSON output format. The prompt also includes additional details that may be helpful, such as robot embodiment information and safety guidelines. At the end, the one-sentence task instruction is appended. Importantly, there is no task-specific information, hints, or human priors embedded in our prompt. See the appendix for the [full prompt](#developer-instructions).

**Configurations.** Unless otherwise noted, all results are reported using the default configuration in {% tabref "ablation-settings" %}. Alternative variants are evaluated in [Case Study and Ablations](#case-study-and-ablations).

**Zero-shot claim.** We regard this configuration as genuinely zero-shot: there is no robot-specific training, fine-tuning, demonstrations, in-context examples, or hand-written skills such as a grasp planner, navigation stack, or object detector. The prompt remains identical for every task and contains no task-specific hints; only the task instruction changes, except in cases where we explicitly test prompt variations.

### Tasks and evaluation protocol

Inspired by prior work "Evaluating $\pi_0$ in the Wild" ([Wang et al., 2025](https://penn-pal-lab.github.io/Pi0-Experiment-in-the-Wild/)), we adopted a "vibe-checking" approach, improvising tasks rather than relying on a standard benchmark. For each task, we defined success criteria, measured relevant metrics, and documented failure modes.

**Example selection.** We include illustrative examples of Astra’s [Strengths](#strengths) and [Weaknesses](#weaknesses) only when the relevant behaviors are observed multiple times across independent runs. This criterion helps distinguish recurring capabilities and limitations from isolated successes or failures that may arise by chance.

**Starting conditions.** Because we aim to test Astra in a real household environment, we varied the initial states of the robot and objects within the bounds of a reasonable test case, unless otherwise noted.

**Stopping and interventions.** An episode ends when Astra declares finished, the operator intervenes to prevent potential damage, the model produces an invalid output, or the time limit for the task is reached. We set different timeout thresholds for each task.
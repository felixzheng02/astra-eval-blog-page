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

<!-- Setup photo: drop the file in media/images/, then move this line below the endraw so it renders.
{% figure "/media/images/setup.jpg", "Stretch 4 in the household environment used for evaluation." %}
-->

### Observation, action, and control loop

{% figure "/media/images/system-overview.png", "Overall Astra control loop.", "system-overview" %}

{% figref "system-overview" %} shows the overall control loop. The system runs in a synchronous `observe -> inference –> execute` loop. In each turn, Astra receives observations, robot proprioception, and previous execution feedback, optionally access depth information through a provided API, and then outputs joint relative position command; the robot executes the command, and new observations and execution feedback are sent to Astra after execution finishes.

**Depth API.** We provide Astra an API that takes in a set of coordinates in wrist camera image space and return the corresponding depths in centimeters in wrist camera frame. During each turn, Astra decides whether or not to use the API, and if so, what coordinates to query.

**Output action.** During each turn, Astra is asked to output either `move`, together with each joint's relative position, or `done`, which indicates task completion. The complete action schema is provided in the appendix.

**Execution feedback.** There are 4 types of execution feedback for each joint:
1. `completed`: target joint position reached;
2. `stopped_short`: joint stops moving, but target joint position not reached;
3. `timeout`: joint still tries to move, but target joint position not reached within a certain timeout limit;
4. `rejected`: target joint position out of limit.

<!-- At each decision step, Astra receives one text message and a set of images:
>>>>>>> 4d6262101cdd92998905cc3a3f65723cf948baa8
At each decision step, Astra receives one **text** message describing the prompt, robot state, and previous action results and a set of **images**. The agent also has access to the context of the conversation:
- **Prompt.** A human written one or two sentence prompt often asking for help with a household task.
- **Images.** A wrist camera (800×500) and the head-center camera (1280×800).
- **Joint state (proprioception).** The current state of the robot’s joints. Base odometry is not included, so the model must judge where the base is from the cameras.
- **Execution feedback (TODO: was this added during our experiments?).** The  result of the previous command (if available): `completed`, `stopped_short`, `timeout`, or `rejected`, followed by one line per commanded joint.
- Two more inputs are switched on only in ablations: Wrist camera depth information and an embodiment description in the format of the robot’s relevant URDF files.

Astra replies with a single JSON object containing a message `kind` (`move` or `done`), a joint command, and its reasoning. Each joint is named and given an explicit direction and a positive amount:

| Joint | Directions | Unit |
| --- | --- | --- |
| `drive` | forward / backward | cm |
| `slide` | left / right | cm |
| `turn` | left / right | deg |
| `lift` | up / down | cm |
| `arm` | extend / retract | cm |
| `wrist_swing` | left / right | deg |
| `wrist_tilt` | up / down | deg |
| `wrist_twist` | clockwise / counterclockwise | deg |
| `grip` | open / close | % of full opening |

Stretch’s onboard control logic moves to the relative positions commanded using configurable velocities and accelerations. Base moves are in the robot's body frame. We switched to named directions instead of signed numbers after early runs where Astra confused the sign conventions of some joints. Here is a typical response, with most joints held:

{% raw %}
```json
{
  "reasoning": "The towel is centered in the wrist view and close. Lower the gripper and close it to grasp.",
  "kind": "move",
  "joint_relative_position_commands": [{
    "drive": {"direction": "hold", "cm": 0},
    "slide": {"direction": "hold", "cm": 0},
    "turn": {"direction": "hold", "deg": 0},
    "lift": {"direction": "down", "cm": 4},
    "arm": {"direction": "hold", "cm": 0},
    "wrist_swing": {"direction": "hold", "deg": 0},
    "wrist_tilt": {"direction": "hold", "deg": 0},
    "wrist_twist": {"direction": "hold", "deg": 0},
    "grip": {"direction": "close", "pct": 60}
  }]
}
```
{% endraw %}

By default, each response contains exactly one command. When action chunking is enabled, Astra predicts *H* commands, all measured from the same observation. The robot executes the first *K* and then observes again. We test *H* = 4, *K* = 2. The robot itself enforces limits on the magnitude of a movement in a single command and rang bounds.

### Control loop

Astra runs in a synchronous observe–>inference–>execute loop. Each turn, the program compiles the current joint state and camera images, sends them to Astra, converts its reply into joint deltas, and executes them on the robot. Once the robot reports that its execution is finished, the loop repeats with new observations. The episode ends when Astra replies `done`.

Astra makes every motion decision, including when the task is finished. The supporting software and dashboard do no planning, perception, grasp selection, or navigation. It only formats observations, translates commands, and reports whether each command completed, stopped short, timed out, or was rejected. The robot has no obstacle avoidance. Its only built-in safety feature is force feedback and an operator that watches every run and presses the run-stop if the robot is about to damage itself or its surroundings. Every turn is logged (images, raw reply, reasoning summary, and latency) for metrics and qualitative analysis. -->


### Our implementation

We access Astra (`gpt-6-astra`) through a Codex CLI instance. It retains no information across experiments, but within each episode, its context preserves the sequence of image and text inputs. This allows Astra to refer back to what it has seen or done earlier in that episode.

For every task, we use a uniform system prompt that specifies the overall objective (controlling a Stretch 4 robot to complete the user's task) and outlines the control loop, including its inputs and the required JSON output format. The prompt also includes additional details that may be helpful, such as robot embodiment information and safety guidelines. At the end, the one-sentence task instruction is appended. Importantly, there is no task-specific information, hints, or human priors embedded in our prompt. See the appendix for the full prompt.

**Configurations.** Unless otherwise noted, all results are reported using the default configuration outlined below. Alternative variants are evaluated in the ablation experiments described in [Case Study and Ablations](05-case-study-ablations.md#case-study--ablations).

| Setting                 | Default                                             | Variants Tested                                 |
|-------------------------|-----------------------------------------------------|-------------------------------------------------|
| Reasoning effort        | high                                                | low, ultra                         |
| Cameras                 | All cameras (head left + head center + head right + wrist) | head center + wrist |
| Wrist depth             | API for Astra to query depths from image coordinates| Color-mapped depth image; no depth                        |
| Proprioception          | On                                                  | Off                                               |
| Execution feedback      | On                                                  | Off                                               |
| Embodiment description  | On                                                  | Off                                             |
| Task prompt             | Task instruction only                               | Task instruction with detailed motion guidance   |

**Zero-shot claim.** We regard this configuration as genuinely zero-shot: there is no robot-specific training, fine-tuning, demonstrations, in-context examples, or hand-written skills such as a grasp planner, navigation stack, or object detector. The prompt remains identical for every task and contains no task-specific hints; only the task instruction changes, except in cases where we explicitly test prompt variations.

### Tasks and evaluation protocol

<!-- We chose household tasks that each probe one or more capabilities: **semantic grounding and reasoning** (understanding what an ambiguous instruction refers to), **spatial understanding**, **active perception** (moving to gather missing information), **fine-grained manipulation**, **deformable objects**, **mobile manipulation**, **long-horizon execution and memory**, and **recovery under perturbation**.

| Task (instruction given to Astra) | Capabilities probed |
| --- | --- |
| "Bring me something I can clean the table with." | Fine-grained manipulation, Semantic grounding, deformable objects, Active Perception |
| "Grab the apple from the kitchen and bring it to the couch." | Semantic grounding, active perception, mobile manipulation |
| "Find the mobile phone under the pillow on the sofa." | Active perception |
| "Make coffee." | Fine-grained manipulation, deformable objects, long-horizon |
| "Pour the water in the green cup into the pink bowl." | Fine-grained manipulation |
| "Clean up the play area." | Fine-grained manipulation, long-horizon |
| "Fold my clothes." | Fine-grained manipulation, deformable objects, long-horizon | -->

{% comment "Felix" %}
Two options: (1) inspired by pi0 blog, we adopted "vibe checking"... (2) we chose tasks that evaluate the following axes... for a complete set of task, see appendix.
{% endcomment %}

Inspired by [Evaluating $\pi_0$ in the Wild](https://penn-pal-lab.github.io/Pi0-Experiment-in-the-Wild/), we adopted a "vibe-checking" approach, improvising tasks rather than relying on a standard benchmark. For each task, we defined success criteria, measured relevant metrics, and documented failure modes. Full experiment logs are included in the appendix.

**Trials.** Given the number of tasks and Astra’s relatively slow inference speed, unless otherwise specified, we performed 5 trials per task. We consider Astra to demonstrate reliable capability in a particular aspect, and include that task as an illustrative example in [Strengths](03-strengths.md#strengths), only if the relevant behavior is observed in at least 80% of trials.

**Metrics.** We measure metrics including completion rate, inference time, token usage, etc. for each rollout. We include full list of metrics and results in appendix.

**Starting conditions.** Because we aim to test Astra in a real household environment, we varied the initial states of the robot and objects within the bounds of a reasonable test case, unless otherwise noted. Detailed starting conditions for each task are included in the appendix.
<!-- **Starting conditions.** Each task begins from a documented scene. For the towel task, a clean pink towel, a used darker rag, and tissue paper lie on the kitchen counter, and the person is out of view. For the phone task, two pillows sit on the sofa with the phone under one of them. Later runs add distractors (a banana, a game controller, and a utensil) and swap the pillow order. For the coffee task, the robot faces an open drawer of coffee pods, the Keurig, and a cup. Later runs add punctured pods and a second cup. Before every trial, a script drives the arm to the same saved pose, so the end effector starts in exactly the same position, and we place the base in approximately the same spot. 

Nima change 10/14: Each task begins from a documented scene. We make sure the observable environment, which includes interactable items and obstacles, is the same between runs. Before every trial, we use a script to drive the arm to the same saved pose and physically move the robot base to the approximately same spot.
-->

<!-- The towel task has the most thorough measurements: 10 valid trials in the default configuration and 5 trials each at medium and high reasoning effort. We ran each other task 3–7 times, often changing the scene or one setting between runs, so we treat those runs as case studies rather than success-rate estimates. We discarded runs where a gripper-overload software lock made the servos silently ignore commands (2 default and 3 medium-effort towel trials). 

Nima change 10/14: The towel task has the most thorough measurements: 10 valid trials in the default configuration and 5 trials each at medium and high reasoning effort. We ran each other task 3–7 times, often changing the scene or one setting between runs, so we treat those runs as case studies rather than success-rate estimates.
-->

<!-- **Success.** We break each task into ordered sub-goals and score each as achieved (1), not achieved (0), or partially achieved (0.5). For example, the towel task's sub-goals are: grab something, grab a towel, grab the used rag, lift it without dropping it, go to the person, and hand it over. The completion rate is the mean over sub-goals. Because "something I can clean the table with" could reasonably mean either the clean towel or the used rag, we report completion both with and without the rag-choice sub-goal. 

Nima change 10/14: We break each task into ordered sub-goals and score each as achieved (1) or not achieved (0). For example, the towel task's sub-goals are: grab something, grab a towel, lift it without dropping it, go to the person, and hand it over. The completion rate is the mean over sub-goals.
-->

**Stopping and interventions.** An episode ends when Astra declares `done`, the operator intervenes to prevent potential damage, the model produces an invalid output, or the time limit for the task is reached. We set different timeout thresholds for each task (see appendix for details).

<!-- Nima change 10/14: An episode ends when Astra declares `done`, when the operator stops it (because damage is imminent or the robot is making no progress, such as repeating the same fold for 20 minutes), or when the model returns an invalid output. We record every human intervention in the trial notes. In a few difficult tasks, such as making coffee, the operator sometimes completes a step the robot is stuck on (for example, closing the Keurig lid). That sub-goal is scored as failed, but the episode continues, and the robot can still earn credit for the remaining sub-goals. -->

<!-- | Metric | Definition |
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
| Token usage | Input tokens (including cached input) plus output tokens (including reasoning) | -->


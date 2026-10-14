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

{% comment "10/14 meeting" %}
move metrics to appendix
{% endcomment %}

### Robot and environment

We use a [Hello Robot Stretch 4](https://hello-robot.com/stretch-4/), a mobile manipulator with 9 degrees of freedom. It has a three-wheel omnidirectional base that can drive in any direction and turn in place, a lift that moves the arm up and down a vertical mast, a telescoping arm, a three-axis wrist (yaw, pitch, roll), and a parallel-jaw gripper. It has an RGB-D camera on the wrist, three cameras on the mast (a center camera plus two fish-eye cameras), and other lidar sensors that we didn't use in our experiments.

The evaluation takes place in a household environment in our lab. It has a kitchen (counter, sink, microwave, fridge, a Keurig coffee maker, drawers, and cabinets), a dining table with chairs, a living area with a sofa, and a play area with toy bins next to a bedroom area with a dresser.

<!-- Setup photo: drop the file in media/images/, then move this line below the endraw so it renders.
{% figure "/media/images/setup.jpg", "Stretch 4 in the household environment used for evaluation." %}
-->

### Observation, action, and control loop

{% figure "/media/images/astra_control_loop.png", "Overall Astra control loop." %}

<!-- At each decision step, Astra receives one text message and a set of images:

- **Images.** By default these are the wrist camera at 800×500 and the head-center camera at 1280×800, sent as JPEGs in a fixed, named order. The prompt tells the model that the head camera is fixed on the mast and only changes view when the base moves, while the wrist camera moves with the arm and wrist.
- **Joint state (proprioception).** Lift height and arm extension in centimeters, wrist swing, tilt, and twist in degrees, and gripper opening in percent (0 is closed, 100 is fully open). Base odometry is not included, so the model has to judge where the base is from the cameras.
- **Execution feedback.** After the first turn, the result of the previous command: `completed`, `stopped_short`, `timeout`, or `rejected`, followed by one line per commanded joint. The prompt explains that `stopped_short` on the gripper usually means the fingers closed on an object, while on any other joint it usually means a collision stopped the motion.

Two more inputs are switched on only in ablations. The first is wrist depth, rendered as a color-mapped image aligned pixel for pixel with the wrist image: red means 10 cm or closer, shifting through yellow and green to blue at 1.5 m or farther, and black means no reading. The second is an embodiment description taken from the Stretch 4 data sheet (size, degrees of freedom, joint travel, reach, payload, and sensors), along with the URDFs of the robot and the gripper.

Astra replies with a single JSON object containing its reasoning, a `kind` (`move` or `done`), and a joint command. Each joint is named and given an explicit direction and a positive amount:

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

Every joint also accepts `hold` with an amount of 0. All amounts are measured from the joint state at the time of the observation, not given as absolute targets. Base moves are in the robot's body frame. We switched to named directions instead of signed numbers after early runs where Astra confused the sign conventions of some joints. Here is a typical response, with most joints held:

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

By default, each response contains exactly one command. When action chunking is enabled, Astra predicts *H* commands, all measured from the same observation. The robot executes the first *K* and then observes again. We test *H* = 4, *K* = 2. The robot itself enforces limits on the size of a single command (50 cm of base translation, about 90° of base rotation, 120 cm of lift, 52 cm of arm extension, about 115° of wrist pitch, and 180° of wrist yaw and roll), and ignores out-of-range commands. Any command that would push the lift, arm, a wrist joint, or the gripper past its soft stop is rejected in full, and nothing moves.

### Control loop

Astra runs in a synchronous observe–predict–execute loop. Each turn, the host waits for the joint state and a fresh frame from every selected camera, sends them to Astra, converts its reply into joint deltas, and executes them on the robot. Once the robot reports a result, the loop repeats with new observations. The episode ends when Astra replies `done` or the operator presses Stop.

Astra makes every motion decision, including when the task is finished. The supporting software does no planning, perception, grasp selection, or navigation. It only formats observations, translates commands, and reports whether each command completed, stopped short, timed out, or was rejected. The robot has no obstacle avoidance. Its only built-in safety feature is force feedback, so an operator watches every run and presses the run-stop if the robot is about to damage itself or its surroundings. Every turn is logged (images, raw reply, reasoning summary, and latency) for metrics and qualitative analysis. -->

### Our implementation

We access Astra (`gpt-6-astra`) through the Codex CLI. Each task episode runs in a single Codex thread. Every turn, including its images, stays in that thread, so Astra can refer back to what it has seen and done earlier in the episode. A fresh thread starts for every episode, so nothing carries over between trials.

Every task uses the same system prompt that states the goal (control a Stretch 4 to complete the user's task), describes the control loop and the inputs, and specify the JSON output format and joint directions. The one-sentence task instruction is appended at the end. Check the appendix for full prompt.

**Default configuration.** Unless stated otherwise, every result uses the configuration below. The ablations in later sections change one or two settings at a time.

| Setting | Default | Variants tested |
| --- | --- | --- |
| Reasoning effort | Low | Medium, high |
| Cameras | Wrist + head center | — |
| Wrist depth | depth api | Color-mapped depth image |
| Proprioception | On | — |
| Execution feedback | On | — |
| Embodiment description | Off | On |
| Task prompt | Instruction sentence only | Reworded ("…without spilling") |

We consider this setting zero-shot. There is no robot-specific training or fine-tuning, no demonstrations or in-context examples, and no hand-written skills such as a grasp planner, navigation stack, or object detector. The prompt is the same for every task, and only the task sentence changes, except where we explicitly ablate prompt wording.

### Tasks and evaluation protocol

<!-- We chose household tasks that each probe one or more capabilities: **semantic grounding and reasoning** (understanding what an ambiguous instruction refers to), **spatial understanding**, **active perception** (moving to gather missing information), **fine-grained manipulation**, **deformable objects**, **mobile manipulation**, **long-horizon execution and memory**, and **recovery under perturbation**.

| Task (instruction given to Astra) | Capabilities probed |
| --- | --- |
| "Bring me something I can clean the table with." | Semantic grounding, deformable objects |
| "Grab the apple from the kitchen and bring it to the couch." | Semantic grounding, active perception, mobile manipulation |
| "Find the mobile phone under the pillow on the sofa." | Active perception |
| "Make coffee." | Fine-grained manipulation, deformable objects, long-horizon |
| "Pour the water in the green cup into the pink bowl." | Fine-grained manipulation |
| "Clean up the play area." | Fine-grained manipulation, long-horizon |
| "Fold my clothes." | Fine-grained manipulation, deformable objects, long-horizon | -->

A paragraph describing tasks evaluated. Two options: (1) inspired by pi0 blog, we adopted "vibe checking"... (2) we chose tasks that evaluate the following axes... for a complete set of task, see appendix.

**Starting conditions.** Since we aim to test Astra in a real hosuehold environment, unless stated otherwise, we randomly initialize the robot and objects states in the environment so that they form a reasonable test case, instead of fixing initial condition. We include detailed starting conditions for each task in the appendix.
<!-- **Starting conditions.** Each task begins from a documented scene. For the towel task, a clean pink towel, a used darker rag, and tissue paper lie on the kitchen counter, and the person is out of view. For the phone task, two pillows sit on the sofa with the phone under one of them. Later runs add distractors (a banana, a game controller, and a utensil) and swap the pillow order. For the coffee task, the robot faces an open drawer of coffee pods, the Keurig, and a cup. Later runs add punctured pods and a second cup. Before every trial, a script drives the arm to the same saved pose, so the end effector starts in exactly the same position, and we place the base in approximately the same spot. -->

**Trials.** Due to the amount of tasks and Astra's slow inference speed, unless stated otherwise, we conducted 5 trials for each task. We consider Astra being strong in a certain aspect and include the task as an example in Section 3 only if that certain behavior appear at least 4/5 trials. 

<!-- The towel task has the most thorough measurements: 10 valid trials in the default configuration and 5 trials each at medium and high reasoning effort. We ran each other task 3–7 times, often changing the scene or one setting between runs, so we treat those runs as case studies rather than success-rate estimates. We discarded runs where a gripper-overload software lock made the servos silently ignore commands (2 default and 3 medium-effort towel trials). -->

<!-- **Success.** We break each task into ordered sub-goals and score each as achieved (1), not achieved (0), or partially achieved (0.5). For example, the towel task's sub-goals are: grab something, grab a towel, grab the used rag, lift it without dropping it, go to the person, and hand it over. The completion rate is the mean over sub-goals. Because "something I can clean the table with" could reasonably mean either the clean towel or the used rag, we report completion both with and without the rag-choice sub-goal. -->

**Stopping and interventions.** An episode ends when Astra declares `done`, when the operator stops it (because damage is imminent), when the model returns invalid output, or when time runs out. We specify different timeout limit for different tasks, details are in appendix.

**Metrics.**

| Metric | Definition |
| --- | --- |
| Completion rate | Fraction of sub-goals achieved |
| Turns | Total codex turns |
| Inference time per turn | Sum of model latency over all turns |
| Total Execution time | Time the robot spends moving, from when each command is sent until its joints stop |
| False-success declarations | Times Astra says `done` when the task is not complete |
| Unnecessary actions | Actions that do not advance the task, including continuing after the task is already complete |
| Interruption by human | Interrupted by human |
| Token usage | Input tokens (including cached input) plus output tokens (including reasoning) |
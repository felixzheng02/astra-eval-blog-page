---
nav: Strengths
---

## Strengths

{% raw %}
<!-- Numbered findings, then a video grid. Copy this block per subsection.

### Finding title

{% videoGrid 2 %}
{% video "/media/videos/success.mp4", "Prompt: …" %}
{% youtube "xxxxxxxxxxx", "Same trial, side view" %}
{% endvideoGrid %}
-->
{% endraw %}

What stood out was not any single task Astra completed, but how much coherent robotic behavior emerged from using a general-purpose VLM zero-shot. Across unfamiliar household tasks, it could often infer what to do, translate that intent into a coordinated sequence of physical actions, and adapt when its first attempt fell short.

### Zero-shot generalization over diverse tasks

Deployed zero-shot in a household environment, Astra can complete a diverse range of tasks, suggesting that a powerful VLM can transfer its knowledge to the physical world and generalize across robotic tasks.

{% videoGrid 2 %}
{% video "/media/videos/grab-napkin.mp4", "(no) " %}
{% video "/media/videos/open-jar.mp4", "Instruction: `help me open the jar`. Astra recognized the user holding a jar, tried a few rotate then lift motions, and finally opened the cap." %}
{% video "/media/videos/toast-bagel.mp4", "Instruction: `toast the bagel`. Astra put the bagel inside the toaster and then pushed the lever down to turn on the toaster." %}
{% video "/media/videos/turn-on-faucet.mp4", "Instruction: `turn on the sink faucet`." %}
{% endvideoGrid %}

For some tasks, while Astra may not consistently achieve full completion, it reliably demonstrates the correct motion intention in nearly every case.

{% videoGrid 2 %}
{% video "/media/videos/pour-ice.mp4", "(yes) Pour ice." %}
{% video "/media/videos/clip-a.mp4", "(no) " %}
{% endvideoGrid %}

### High-level reasoning and planning

Even though VLMs are known for strong semantic understanding and are widely used for high-level task planning in robotics, we were impressed by how Astra grounds these capabilities in physical actions, enabling active perception, strong understanding of user intent, and robust planning and replanning.

#### It actively gathers information it needs

{% videoGrid 2 %}
{% video "/media/videos/clip-a.mp4", "(yes) find phone." %}
{% video "/media/videos/put-apple-on-nightstand.mp4", "(yes) Instruction: `put an apple on the nightstand`." %}
{% endvideoGrid %}

#### It understands ambiguous task instructions

{% videoGrid 2 %}
{% video "/media/videos/bring-me-wipe-table.mp4", "(yes) Find me something to wipe the table." %}
{% video "/media/videos/clip-a.mp4", "(no)" %}
{% endvideoGrid %}

#### It plans over long horizons and replans when necessary

{% videoGrid 2 %}
{% video "/media/videos/put-ball-in-drawer-replan.mp4", "Instruction: `put the ball in the drawer`." %}
{% video "/media/videos/clean-up-play-area.mp4", "(yes) Clean up the play area." %}
{% endvideoGrid %}

### Coordination of mobile base and arm

We found that Astra can adjust its whole-body pose by controlling the mobile base and arm together, enabling it to perform tasks that require coordinated movement.

{% videoGrid 2 %}
{% video "/media/videos/open-cabinet.mp4", "Instruction: `open the left door of the cabinet under the sink`. Note how Astra moved the base and swinged the wrist to the right simultaneously to open the door." %}
{% video "/media/videos/clean-spilled-water.mp4", "Instruction: `upright the cup and clean up the mess`. Note how Astra wiped the water by moving the base left and right, repositioning the wrist holding the towel without moving the arm or wrist joints." %}
{% endvideoGrid %}

### Strong language steerability and adaptation

We found that Astra can generate motion commands that closely follow detailed natural-language instructions specifying exactly how the robot should move, such as precise arm positioning, gripper orientation, or base adjustments.

{% videoGrid 2 %}
{% video "/media/videos/open-dishwasher-nonsteered.mp4", "(yes) Instruction: `Open the dishwasher door.`." %}
{% video "/media/videos/open-dishwasher-steered.mp4", "(yes) Instruction: `Open the dishwasher door. First, grasp the handle from above, positioning one finger between the handle and the door. Slowly retract the arm while lowering the lift, continuously adjusting the wrist orientation to keep the finger aligned with the door and prevent it from getting wedged between the handle and the door. Once the dishwasher door is halfway open, carefully release the gripper and retract the arm without colliding with the door. Then, move to the left side of the dishwasher and finish opening the door by pushing against its inner surface.`" %}
{% endvideoGrid %}

### Failure recovery

When Astra encounters difficulty completing a task, it autonomously attempts alternative strategies. This works particularly well when the source of the difficulty lies within the current step. Its recovery is less effective when the problem stems from an earlier step; see [Fails to reason about dependencies across steps](#fails-to-reason-about-dependencies-across-steps).

{% videoGrid 2 %}
{% video "/media/videos/close-dishwasher.mp4", "(yes) Close dishwasher." %}
{% video "/media/videos/turn-on-faucet-different-ways.mp4", "Instruction: `turn on the sink faucet`. After a few failed attempt due to slippery horizontal grasping, Astra changed strategy, grasped vertically, and successfully turned on the faucet." %}
{% endvideoGrid %}
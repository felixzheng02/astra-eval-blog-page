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
{% video "/media/videos/grab-napkin.mp4", "Instruction: `Pull out a tissue.`; Astra made several attempts before ultimately succeeding in grasping a napkin." %}
{% video "/media/videos/open-jar.mp4", "Instruction: `Help me open the jar.`; Astra recognized the user holding a jar, tried a few rotate then lift motions, and finally opened the cap." %}
{% video "/media/videos/toast-bagel.mp4", "Instruction: `Toast the bagel.`; Astra put the bagel inside the toaster and then pushed the lever down to turn on the toaster." %}
{% video "/media/videos/turn-on-lamp.mp4", "Instruction: `Turn on the lamp.`; Astra attempted multiple times to grasp the pull chain and then pull downward to turn on the lamp." %}
{% endvideoGrid %}

For some tasks, while Astra may not consistently achieve full completion, it reliably demonstrates the correct motion intention in nearly every case.

{% videoGrid 2 %}
{% video "/media/videos/pour-ice.mp4", "Instruction: `Pour ice cubes to another cup.`; While a few ice cubes spilled, Astra clearly demonstrated the intended behavior of aligning the cups and executing the pour." %}
{% video "/media/videos/make-bed.mp4", "Instruction: `Make bed.`; Astra showed the intended motion of flattening the blanket, though the execution was not perfect." %}
{% endvideoGrid %}

### High-level reasoning and planning

Even though VLMs are known for strong semantic understanding and are widely used for high-level task planning in robotics, we were impressed by how Astra grounds these capabilities in physical actions, enabling active perception, strong understanding of user intent, and robust planning and replanning.

#### It actively gathers information it needs

{% videoGrid 2 %}
{% video "/media/videos/find-phone.mp4", "Instruction: `Find the android phone in the living room.`; The phone was deliberately placed beneath a pillow, and Astra located it by purposefully moving the pillow aside." %}
{% video "/media/videos/put-apple-on-nightstand.mp4", "Instruction: `Put an apple on the nightstand.`; With both the bedroom and the apple initially out of view of any camera, Astra navigated the environment, moving the base to discover both, and complete the task." %}
{% endvideoGrid %}

#### It understands ambiguous task instructions

{% videoGrid 2 %}
{% video "/media/videos/bring-me-wipe-table.mp4", "Instruction: `Bring me something to wipe the table.`; With both napkins and a towel available, Astra correctly selected the towel, a better choice for wiping the table. It then located the human and handed it over. Notably, Astra waited until the human's hand was ready before releasing the towel." %}
{% video "/media/videos/set-table.mp4", "Instruction: `Set up the table.`; Astra successfully interpreted this ambiguous instruction, transforming it into clear, concrete actions by arranging the plate, cup, and utensils appropriately." %}
{% endvideoGrid %}

#### It plans over long horizons and replans when necessary

{% videoGrid 2 %}
{% video "/media/videos/put-ball-in-drawer-replan.mp4", "Instruction: `Put the ball in the drawer.`; When a human intervened by closing the drawer, Astra did not simply drop the ball but instead placed it in a stable position before reopening the drawer. Observe how Astra adapts its actions as the human repeatedly closes and opens the drawer." %}
{% video "/media/videos/clean-up-play-area.mp4", "Instruction: `Clean up the play area.`; With four toys on the ground, Astra reliably planned and placed each toy into its designated location, and replanned when a toy was accidentally dropped." %}
{% endvideoGrid %}

### Coordination of mobile base and arm

We found that Astra can adjust its whole-body pose by controlling the mobile base and arm together, enabling it to perform tasks that require coordinated movement.

{% videoGrid 2 %}
{% video "/media/videos/open-cabinet.mp4", "Instruction: `Open the left door of the cabinet under the sink.`; Astra simultaneously moved the base and swung the wrist to the right to smoothly open the door." %}
{% video "/media/videos/clean-spilled-water.mp4", "Instruction: `Upright the cup and clean up the mess.`; Astra wiped up the water by moving the base left and right, repositioning the wrist holding the towel without adjusting the arm or wrist joints." %}
{% endvideoGrid %}

### Strong language steerability and adaptation

We found that Astra can generate motion commands that closely follow detailed natural-language instructions specifying exactly how the robot should move, such as precise arm positioning, gripper orientation, or base adjustments.

{% videoGrid 2 %}
{% video "/media/videos/open-dishwasher-nonsteered.mp4", "Instruction: `Open the dishwasher door.`; Without additional guidance, Astra repeatedly attempted to grasp the handle in the most ordinary manner, but failed several times due to slippage." %}
{% video "/media/videos/open-dishwasher-steered.mp4", "Instruction: `Open the dishwasher door. First, grasp the handle from above, positioning one finger 
between the handle and the door. Slowly retract the arm while lowering the lift, continuously adjusting the wrist orientation to keep the finger aligned with the 
door and prevent it from getting wedged between the handle and the door. Once the dishwasher door is halfway open, carefully release the gripper and retract the 
arm without colliding with the door. Then, move to the left side of the dishwasher and finish opening the door by pushing against its inner surface.`; With these detailed instructions, Astra closely followed each step and successfully opened the dishwasher." %}
{% endvideoGrid %}

### Failure recovery

When Astra encounters difficulty completing a task, it autonomously attempts alternative strategies. This works particularly well when the source of the difficulty lies within the current step. Its recovery is less effective when the problem stems from an earlier step; see [Fails to reason about dependencies across steps](#fails-to-reason-about-dependencies-across-steps).

{% videoGrid 2 %}
{% video "/media/videos/close-dishwasher.mp4", "Instruction: `Close the dishwasher.`; After several unsuccessful grasp attempts due to slippage, Astra switched the strategy by moving the gripper beneath the door and successfully closing it by tilting and pushing." %}
{% video "/media/videos/turn-on-faucet-different-ways.mp4", "Instruction: `Turn on the sink faucet.`; After several failed attempts with a slippery horizontal grasp, Astra adapted its strategy: it switched to a vertical grasp and successfully turned on the faucet." %}
{% endvideoGrid %}
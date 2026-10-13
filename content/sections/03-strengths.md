---
nav: Where We Were Impressed
---

## Where We Were Impressed

{% raw %}
<!-- Numbered findings, then a video grid. Copy this block per subsection.

### Finding title

{% videoGrid 2 %}
{% video "/media/videos/success.mp4", "Prompt: …" %}
{% youtube "xxxxxxxxxxx", "Same trial, side view" %}
{% endvideoGrid %}
-->
{% endraw %}

{% callout "How to read this section" %}
The behaviors below come from a small number of episodes (for example, 7 for making coffee and 4 for the toy clean-up), often run under different settings. They are <strong>individual observations, not statistically significant results</strong>. They show what Astra <em>can</em> do, not how often it does it, and we do not take them as proof of higher-order reasoning. Where we quote Astra's reasoning, we are quoting the summary the model reports about itself, which may not reflect how it actually arrived at an action.
{% endcallout %}

### Correct motion intention

(could further divide into subpoints later; need more tasks & demos)

Across several tasks, Astra selected motions that matched the intended goal, even when their execution was imprecise. This was clearest in actions such as tilting a cup to pour or turning it upside down for dishwasher placement.

##### Pouring: the right motion, before the right precision

Given the prompt *"Pour the water in the green cup into the pink bowl"*, Astra carried the cup over the bowl and **tilted it to pour**. Nothing in the prompt said which joint to rotate or in which direction, and Astra has no pouring primitive to call. It produced the pour as a sequence of relative joint displacements. When its first tilt from the right side produced no water, it moved to the left side of the bowl and poured from left to right. The cup is opaque, so Astra had no way to see how much water was inside or how far the cup needed to tip before water would flow. Its first attempt was therefore a reasonable guess that turned out to be too shallow. The execution was far from clean: across our pour episodes the water was released from too high and much of it landed on the counter (see [Weaknesses](#weaknesses)). Even so, the **choice of motion** was right. Astra treated pouring as rotating a held container above the target, and when the first tilt failed it adjusted the motion instead of giving up.

{% figure { src: "/media/images/pour-tilt.jpg", caption: "Pour water: Astra carries the cup over the bowl and tilts it to pour, without being told which joints perform a pour.", width: "55%" } %}

Try a smaller deformable object. I think this should work.

##### Orienting a cup for the dishwasher

With a cup already in the gripper, Astra rotated the arm and wrist to orient the cup with its opening facing downward for placement in the dishwasher. It selected a useful orientation even though the first two placements missed the rack (see the [dishwasher case study](#load-a-cup-into-the-dishwasher)).

### High-level reasoning & planning

#### It understands (ambiguous) task instruction

Transport something from kitchen to bedroom

Find me something to wipe the table

*"Grab the apple from the kitchen and bring it to the couch."*

Astra grounds all three components of the instruction correctly: the target object (the apple), its source location (the kitchen), and the goal (the couch). This held in every attempt, so the failures we describe later are not failures of instruction understanding.

*"Find the mobile phone under the pillow on the sofa."*

"Find" turned out to be underspecified. We meant retrieve the phone, but Astra interpreted it as localize it: in every run it ended by announcing the phone as found as soon as the phone was visible. Since the instruction never asks for retrieval, we don't count this against Astra. It does show that Astra resolves ambiguity toward the most literal reading, so the instruction has to state the goal explicitly.

#### It actively gathers information it needs

Actively looking for user and handover

*"Find the mobile phone under the pillow on the sofa."*

The phone is occluded at the start, so the task requires active search rather than a single look-and-grasp. Astra navigates to the sofa, stops within arm's reach facing it, and inspects the pillows sequentially. We can't see its internal state, but it behaves as if it keeps a list of candidate occluders: once one pillow turns out to have nothing under it, it moves directly to the next without revisiting.

After each pillow is displaced, Astra's visual check of the space underneath is reliable. It reports the phone as found only when a phone is actually visible. Otherwise it reports that the phone is not there and continues the search until it finds it.

*"Grab the apple from the kitchen and bring it to the couch."*

Target localization is reliable when the apple is within the camera's field of view, and Astra looks for it in a sensible place (the kitchen counter). It degrades under occlusion, which we cover under Weaknesses.

In the dishwasher task, the robot started with a cup in its gripper while facing the table. Astra turned the robot to search for the dishwasher and found it. This was another example of changing the viewpoint to acquire information needed for the next step.

##### Moving the arm out of its own way

While making coffee, Astra repeatedly **moved its own arm to see better**. On the Stretch, the arm and wrist often sit between the head camera and the object being handled. In one episode the arm blocked the view of the cup. Astra's reasoning read *"Retracting to reveal handle"*, and it pulled the arm back to get a clear view before planning the grasp. Nothing in the prompt told Astra that its arm could block its cameras.

#### It plans over long-horizon, and replans when necessary

*"Grab the apple from the kitchen and bring it to the couch."*

Astra shows persistent retry behavior. Over many failed attempts at the apple grasp, it adjusted its approach between attempts and kept going rather than stalling or aborting. It also verifies the grasp once the arm retracts, so a dropped apple triggers re-planning. How long that re-planning takes is covered under Latency.

*"Find the mobile phone under the pillow on the sofa."*

The same pattern appears with the pillow. It slipped out of the gripper repeatedly, and Astra kept retrying until it secured it.

##### Making coffee from a two-word prompt

Making coffee with a Keurig is a long sequence of dependent steps. The robot has to take a pod from a drawer, open the lid, seat the pod, close the lid, place a cup under the spout, and press the brew button. The prompt, which was purposely left vague, "make coffee" produced consistent **decomposition of the task into the correct sub goals** across all our runs. However, Astra did not commit to a single fixed order. Some runs involved handling the pod first and the cup last - vice versa. Its semantic choices within the plan were often sensible too. In one run it **skipped a pod that had already been punctured** and picked an unused one. In another it **ignored objects that looked like pods but sat outside the pod drawer**. When it held a pod facing the wrong way, it **rotated the pod** before placing it.

{% videoGrid 2 %}
{% video { src: "/media/videos/coffee-pod-drawer-to-keurig.mp4", caption: "Make coffee: Astra reaches into the open drawer for a pod and carries it toward the Keurig.", poster: "/media/images/coffee-pod-drawer-to-keurig-poster.jpg" } %}
{% figure "/media/images/coffee-02-pick-pod.jpg", "Picking a pod out of the drawer." %}
{% endvideoGrid %}

##### Re-opening the right drawer

The coffee pods are kept in one of **four stacked drawers** beside the sink. In one episode, the pod drawer slid shut partway through the task. Astra noticed that the drawer was closed and that the pods were no longer within reach. It then **picked the correct drawer out of the four** and pulled on it repeatedly to re-open it, without trying any of the other three.

This is harder than it may sound. Once the drawer was closed, the pods were out of sight, and all four drawer fronts look alike. Nothing in the current camera images showed where the pods were. We see two likely explanations, and both rely on information Astra gathered earlier in the same episode. The first is **memory of earlier frames**: every earlier image and reply in the episode stays in Astra's context, including the frames where it reached into the open drawer. The second is **memory of its own body**: earlier turns also contain the joint state, including the lift height at which it had reached into that drawer, so it could return to the same level. We cannot tell which of these Astra relied on. In either case, it used **what it had seen and done earlier** to act on something it could no longer see, and it then **kept retrying the same drawer** instead of searching the other three. We saw this once, so we treat it as an encouraging example and not a reliable capability.

{% figureGrid 2 %}
{% figure "/media/images/coffee-01-scene.jpg", "The coffee station: the pod drawer is one of the stacked drawers beside the sink." %}
{% figure "/media/images/setup-stretch4-kitchen.jpg", "Astra reaching into the open pod drawer. Once this drawer is closed, the pods are hidden from every camera." %}
{% endfigureGrid %}

##### Recovering a dropped cup

In another coffee episode, run with embodiment information and depth turned on, Astra **dropped the cup** while lifting it off the counter. What followed was a complete recovery sequence:

1. It **noticed the drop**. The Stretch's gripper has no touch sensing, so every cue available to Astra is indirect. The cup is no longer between the fingers in the gripper camera, it is lying on the counter in the head camera, and the gripper's reported opening is narrower than a cup.
2. It **re-located the cup**. The fall had changed the cup's position, so the grasp it had planned before no longer applied.
3. It **re-grasped the cup on the first attempt** and retracted the arm.
4. It tried to place the cup under the Keurig's spout, **missed once, and corrected on the second attempt**.

The comparison with other episodes is what makes this stand out. In episode 3, after knocking a cup off the counter, Astra ended the episode with *"Stopping after gripper failure"*. In episode 5, the cup fell during placement and the operator had to stop the run. The episode described here is the **only one of the three cup failures in which Astra recovered on its own**. That episode also had embodiment information and depth turned on, but with a single example we cannot say whether those settings made the difference.

##### Cleaning up toys without being told how

In the toy clean-up task, the only instruction was *"Clean up the play area"*. Astra worked out on its own what cleaning up meant: picking each toy off the floor and putting it away in a bin. In **2 of our 4 episodes** it **picked up every toy** in the area without help, and in one of those it returned `done` right when the floor was clear. In one episode it also **sorted the toys by type**, putting the blocks with the other blocks and the remaining toys in a separate bin, even though nobody asked it to sort.

### Coordination of mobility and manipulation

We found Astra is able to appropriately control both the mobile base and the arm simultaneously, better utilizing both capabilities to achieve tasks.

After we revised the action schema, Astra opened both cabinet doors under the sink. The task involves coordinating the base and arm as the door moves. We describe the axis and sign errors that motivated the change in the [action-interface case study](#debugging-the-action-interface).

Design a case: the target location is initially unreachable by directly extending arm; desired behavior: Astra first tried fully extending arm -> move base directly towards it rejected by obstacle avoidance -> try to move around

Base navigation was the most reliable component in both tasks. In the apple task, Astra reaches the couch with the apple still held, so it localizes the couch correctly. In the phone task, it positions the base within arm's reach of the sofa without contact, and aligns the gripper with the pillow's height and a corner or edge.

##### Fluid motion with action chunking

In the toy clean-up task, action chunking changed how the robot moved. With a 4/2 chunk, Astra predicts four waypoints per turn and the robot executes the first two before the next observation. After dropping a toy in the bin, the robot **backed away, retracted the arm, and opened the gripper** in what looked like one continuous motion. At first glance these motions seemed to happen at the same time. We have not yet confirmed this from the command logs, and we think the more likely explanation is different. Without chunking, every motion is followed by a pause while the model takes its next turn. With chunking, the two executed waypoints run **back to back with no inference pause between them**. Short motions that follow one another this quickly look like a single fluid action, and the episode as a whole finishes much faster. In the same episode, Astra also appeared to **drive around the toys** on the floor instead of over them.

### High language steerability and adaptation

In one dishwasher trial, we instructed Astra to move the base rather than keep extending the arm toward the target. It changed its behavior and used the base, providing an example of how a concrete movement instruction can influence action selection.

Close oven door.

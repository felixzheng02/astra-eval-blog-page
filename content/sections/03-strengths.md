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

### Correct motion intention

(could further divide into subpoints later; need more tasks & demos)

We found Astra is able to not only output correct high-level reasoning & planning on how to approach a task, but also ground it to the physical world and output actions with correct intention, zero-shotly on almost any tasks.

Pour water

Try a smaller deformable object. I think this should work.

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

#### It plans over long-horizon, and replans when necessary

Make coffee: right reasoning & planning over steps

open drawer over and over again

clean up toys

*"Grab the apple from the kitchen and bring it to the couch."*

Astra shows persistent retry behavior. Over many failed attempts at the apple grasp, it adjusted its approach between attempts and kept going rather than stalling or aborting. It also verifies the grasp once the arm retracts, so a dropped apple triggers re-planning. How long that re-planning takes is covered under Latency.

*"Find the mobile phone under the pillow on the sofa."*

The same pattern appears with the pillow. It slipped out of the gripper repeatedly, and Astra kept retrying until it secured it.

### Coordination of mobility and manipulation

We found Astra is able to appropriately control both the mobile base and the arm simultaneously, better utilizing both capabilities to achieve tasks.

Open cabinet requires moving the base and the arm together to pull the door.

Design a case: the target location is initially unreachable by directly extending arm; desired behavior: Astra first tried fully extending arm -> move base directly towards it rejected by obstacle avoidance -> try to move around

Base navigation was the most reliable component in both tasks. In the apple task, Astra reaches the couch with the apple still held, so it localizes the couch correctly. In the phone task, it positions the base within arm's reach of the sofa without contact, and aligns the gripper with the pillow's height and a corner or edge.

### High language steerablity and adaptation

Close oven door.
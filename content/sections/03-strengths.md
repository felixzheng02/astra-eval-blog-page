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

We found Astra is able to not only output correct high-level reasoning & planning on how to approach a task, but also ground it to the physical world and output actions with correct intention, zero-shotly on almost any tasks.

##### Pouring: the right motion, before the right precision

Given the prompt *"Pour the water in the green cup into the pink bowl"*, Astra carried the cup over the bowl and **tilted it to pour**. Nothing in the prompt said which joint to rotate or in which direction, and Astra has no pouring primitive to call. It produced the pour as a sequence of relative joint displacements. When its first tilt from the right side produced no water, it moved to the left side of the bowl and poured from left to right. The cup is opaque, so Astra had no way to see how much water was inside or how far the cup needed to tip before water would flow. Its first attempt was therefore a reasonable guess that turned out to be too shallow. The execution was far from clean: across our pour episodes the water was released from too high and much of it landed on the counter (see [Weaknesses](#weaknesses)). Even so, the **choice of motion** was right. Astra treated pouring as rotating a held container above the target, and when the first tilt failed it adjusted the motion instead of giving up.

{% figure { src: "/media/images/pour-tilt.jpg", caption: "Pour water: Astra carries the cup over the bowl and tilts it to pour, without being told which joints perform a pour.", width: "55%" } %}

Try a smaller deformable object. I think this should work.

### High-level reasoning & planning

#### It understands (ambiguous) task instruction

Transport something from kitchen to bedroom

Find me something to wipe the table

#### It actively gathers information it needs

Actively looking for user and handover

##### Moving the arm out of its own way

While making coffee, Astra repeatedly **moved its own arm to see better**. On the Stretch, the arm and wrist often sit between the head camera and the object being handled. In one episode the arm blocked the view of the cup. Astra's reasoning read *"Retracting to reveal handle"*, and it pulled the arm back to get a clear view before planning the grasp. Nothing in the prompt told Astra that its arm could block its cameras.

#### It plans over long-horizon, and replans when necessary

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

We found AaP is able to appropriately control both the mobile base and the arm simultaneously, better utilizing both capabilities to achieve tasks.

Open cabinet requires moving the base and the arm together to pull the door.

Design a case: the target location is initially unreachable by directly extending arm; desired behavior: AaP first tried fully extending arm -> move base directly towards it rejected by obstacle avoidance -> try to move around

##### Fluid motion with action chunking

In the toy clean-up task, action chunking changed how the robot moved. With a 4/2 chunk, Astra predicts four waypoints per turn and the robot executes the first two before the next observation. After dropping a toy in the bin, the robot **backed away, retracted the arm, and opened the gripper** in what looked like one continuous motion. At first glance these motions seemed to happen at the same time. We have not yet confirmed this from the command logs, and we think the more likely explanation is different. Without chunking, every motion is followed by a pause while the model takes its next turn. With chunking, the two executed waypoints run **back to back with no inference pause between them**. Short motions that follow one another this quickly look like a single fluid action, and the episode as a whole finishes much faster. In the same episode, Astra also appeared to **drive around the toys** on the floor instead of over them.

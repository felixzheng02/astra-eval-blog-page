---
nav: Weaknesses
---

## Weaknesses

{% raw %}
<!-- Markdown tables work as-is. Figures live in media/images/.

{% figure "/media/images/overview.png", "Figure caption" %}

{% figureGrid 2 %}
{% figure "/media/images/left.png", "Left" %}
{% figure "/media/images/right.png", "Right" %}
{% endfigureGrid %}

| Instruction | Success rate | Behavior |
| --- | --- | --- |
| "task A" |  |  |
| "task B" |  |  |
-->
{% endraw %}

<!-- The failures we saw were not random. Most of them happened in the **same few situations**: the robot's own arm blocking its view, contact and force deciding the outcome, or Astra having nothing in its interface to report that something had gone wrong. Many of these situations are hard for **any** system that works from camera images alone, not just for Astra. Where we can, we describe what we saw, what we think is causing it, and what might help. The same caveat as before applies: these are counts from a handful of episodes, not measured failure rates. -->

### Fine-grained manipulation

Astra struggles with fine-grained manipulation in general, for the following possible reasonings: (1) fine-grained manipulation is inherently hard for robots with one parallel-jar gripper and no force feedback, (2) Astra apparently lack the "physical commonsense" (cite Andy Zeng) required for some tasks

{% videoGrid 3 %}
{% video "/media/videos/clip-a.mp4", "Open cabinet." %}
{% video "/media/videos/clip-a.mp4", "Open the fridge." %}
{% video "/media/videos/clip-a.mp4", "Design a case: the target location is initially unreachable by directly extending arm; desired behavior: Astra first tried fully extending arm -> move base directly towards it rejected by obstacle avoidance -> try to move around." %}
{% endvideoGrid %}

<!-- **What we saw.** Astra's plans were usually right, but steps that come down to millimeters and force often failed. In the coffee task, Astra **did not fully seat the pod in any of the first 6 episodes**. In one of those, the operator had to push the pod down by hand. Closing the Keurig lid **failed twice in a single episode**, and pressing the brew button took several small corrections before the gripper was aligned with it. Astra also **deformed a pod by squeezing too hard**, after which the pod could not be pushed into place. Other tasks showed the same pattern. The toy drill took **4–5 attempts** to pick up. While folding a hoodie, Astra closed the gripper when it was nowhere near the fabric and missed the hem several times.

**Why this is hard.** Placing a coffee pod is a demanding task for a robot that sees the world only through its cameras:

- **The best view is blocked.** When the telescoping arm reaches over the Keurig, the arm and wrist sit between the head camera and the pod holder. That leaves the **gripper camera as the only view of the slot**, and it sees the slot from a steep angle, at very close range, against the **dark interior of a black machine**. Judging whether a pod is level in its holder from that view is difficult.
- **Seating a pod is about feel, not sight.** Whether a pod is fully pressed in, or a lid has latched, shows up as a few millimeters in the image at most. A person does this by feel. The Stretch's gripper has no touch sensing, so Astra has to judge contact from pictures alone.
- **Astra controls position, not force.** The gripper is commanded as a percentage of how far it is open. Astra cannot ask for a gentle grip. It can only choose how closed the fingers should be, and choosing slightly too closed crushes a soft pod.
- **Fabric is thin and flat.** Grasping cloth that lies on a table means closing the fingertips within a few millimeters of a hard surface. Small errors in judging height turn into empty grasps. Adding depth, together with embodiment information, noticeably improved grasping in the fold task (see [Case Study & Ablations](#case-study-ablations)), which fits this explanation.

**What might help.** A second camera angle on the work area, force or contact feedback in the observation, and grip commands that limit squeezing force instead of only setting how far the fingers close.

{% figureGrid 2 %}
{% figure "/media/images/coffee-04-press-pod.jpg", "Pressing the pod in. With the arm over the Keurig, the pod holder is hidden from the head camera; only the gripper camera sees it, at a steep angle against a dark background." %}
{% figure "/media/images/coffee-punctured-pod.jpg", "Coffee pods are small and soft. Astra controls how closed the gripper is, not how hard it squeezes, and in one episode it deformed a pod." %}
{% endfigureGrid %}

The apple and phone tasks show the same pattern. Failures concentrate in contact-rich steps, where the end-effector has to reach a precise pose or handle an object with the right grip. Astra's plan for these steps is sensible. The low-level execution is imprecise.

#### Approach and pre-grasp alignment

*"Grab the apple from the kitchen and bring it to the couch."*

Positioning the gripper next to the apple took many attempts. Astra has no consistent approach strategy: it varies how it approaches from one attempt to the next, and the end-effector placement is imprecise.

#### Grasping

Grasping was the weakest primitive we tested. Astra does not appear to know where on the apple to grasp, and it does not regulate grip force: the gripper left marks on the apple. It also makes little use of visual feedback to verify the grasp. Failure is detected only at the lift stage, when it checks that the apple is still held after the arm retracts, and by then the apple has already dropped.

Cup pickup showed a similar pattern. Picking up the cup required **roughly four or five retries**, with difficulty observed both on the kitchen counter and on the table. Astra varied its approach across attempts. We subsequently started with the cup already in the gripper to examine the remaining steps of the [dishwasher task](#load-a-cup-into-the-dishwasher).

#### Tasks requiring sustained force

Opening the refrigerator was unsuccessful, whereas Astra opened both lower-resistance cabinet doors under the sink after the action-schema change. The greater pulling force required by the refrigerator may contribute to this difference, alongside grasp security, robot posture, and pulling direction.

#### Deformable objects

*"Find the mobile phone under the pillow on the sofa."*

The pillow was a different problem from the apple. Its shape changes under the gripper, and it slipped out of the grasp on every attempt. Astra secured it only after many retries, and then tossed it aside instead of moving it deliberately.

#### Placement

*"Grab the apple from the kitchen and bring it to the couch."*

Placement is where the apple task failed. In two of three attempts the apple did not end up resting on the couch, and the run did not complete. Up to that point, grounding, localization, grasping and navigation had all worked, and Astra had already selected a placement location. We do not think this was a failure of task understanding, and we do not yet have a clear explanation for it.

Persistence seems to mask this imprecision when retries are free, as with the pillow, but not when a failed grasp has a physical cost, as with the dropped apple. -->

### Repeated failure modes

We noticed that Astra is inclined to attempt solving the task in the most obvious way, and often fails to reason about failures and try a different approach accordingly.

{% videoGrid 2 %}
{% video "/media/videos/clip-a.mp4", "Open the oven's door." %}
{% video "/media/videos/clip-a.mp4", "Stack the bottled water onto the cup." %}
{% endvideoGrid %}

<!-- ### Spatial reasoning -->

<!-- **What we saw.** Astra often lost track of **where its body was relative to nearby objects**. In the coffee task it **struck the open Keurig lid** while raising the arm after placing a pod (twice in one episode), scraped the **bottom of the sink** while reaching for a cup, hit the Keurig while placing a cup, pushed the Keurig backward, pressed the gripper hard into a drawer, and bumped the fridge during a series of moves to the right. The operator had to step in to prevent damage in **at least 2 of the first 6 coffee episodes**. In the toy clean-up task, it ran into the dresser and the toy drawer, and in one episode drove over toys. When pouring, it **could not tell whether the cup was over the bowl**, and in **none of the 3 pour episodes we recorded** did the water go cleanly into the bowl.

In the RGB-only cup and door trials, Astra also misjudged the distance between the gripper, target, and surrounding surfaces, sometimes extending the arm into a cabinet or the refrigerator. The absence of depth input is a possible contributor to these errors.

**Why we think it happens.**

- **Some obstacles are outside every camera view.** The Keurig's lid hinges open **directly above the pod holder**. When the gripper is down in the holder, the gripper camera points at the pod and the arm blocks the head camera, so no camera can see the lid that the arm is about to rise into.
- **The arm reaches out to the side.** The Stretch's telescoping arm extends perpendicular to the direction the base drives. When the base moves with the arm extended, the arm sweeps sideways through the room, which explains contacts like the fridge. Obstacles low and close to the base, such as the dresser and the toy drawer, are also easy to miss from cameras mounted at the top of the mast.
- **Height is hard to judge from a single image.** To pour, Astra has to judge how high the cup is above the bowl. Once the cup is in the gripper, it fills much of the gripper camera's view and can hide the bowl. The head camera sees both objects from far above at an angle, so their vertical gap is difficult to read. Asking it to pour "without spilling" adds no new information about height, which is consistent with that wording not helping.
- **Joint limits do not establish obstacle clearance.** Our original executor enforced joint limits without collision checking, and the Stretch's line sensors were not part of the observation.

**What we changed.** To address continued pushing after overextension, we added a safety guard that reverses an action when a joint's force threshold is exceeded. The controller can respond without waiting for another model turn. The guard reacts after contact; it does not prevent the initial collision.

**What might help.** Giving Astra the line sensors, checking motions against a simple collision model before they run, and including the depth image (which on its own did not remove contacts in our runs, but gives height information that pouring clearly needs).

{% videoGrid 2 %}
{% figure "/media/images/coffee-06-close-lid.jpg", "The lid hinges open directly above the pod holder. Raising the arm straight up after placing a pod runs the gripper into it, and no camera has the lid in view at that moment." %}
{% video { src: "/media/videos/pour-spill.mp4", caption: "Pour water: the cup is held over the bowl, but the water was poured from too high and most of it landed on the counter mat.", poster: "/media/images/pour-spill-poster.jpg" } %}
{% endvideoGrid %}

#### Placement-site selection

For the apple, Astra chose a placement location on the couch, but the location was suboptimal. It does not seem to apply a good criterion for what counts as a good enough spot.

#### Occlusion and partial observability

Target localization is reliable when the object is within the camera's field of view and degrades when it is occluded. The phone task is a different case, since the instruction itself told Astra where the occluder was. -->

<!-- ### Awareness of side effects -->

<!-- Astra shows little awareness of how its motions affect nearby objects. Around the apple, it does not act as though the neighboring fruit is delicate or needs to be avoided. With the pillow, once it had a grasp, it threw the pillow aside with no regard for where it landed. That is harmless for a pillow, and arguably efficient, but it is the same behavior that would be a problem around fragile objects. In both cases the planning appears to consider only the target object, with no model of collateral effects. -->

<!-- ### Knowing when the task is done -->

<!-- **What we saw.** Astra did not reliably end episodes correctly. In 1 of the 7 coffee episodes it reported success when the task was not done, returning *"DONE - Stopping with tilted cup"*. In another it ended the episode with *"Stopping after gripper failure"*. In other episodes it went the other way: after pressing the brew button it **kept sending `move` commands** and never declared the task finished.

**Why we think it happens.** Part of the problem is our **interface**. Astra can only answer `move` or `done`. It has no way to say "I failed" or "I need help", so `done` ends up meaning both "I succeeded" and "I am stopping". Both quotes above show Astra knew something had gone wrong, and `done` was the only way it had to stop. Part of it is the **task**: right after the button is pressed, a Keurig looks almost exactly the same as before, and brewing typically starts only after a short delay. Astra cannot hear the machine, so it has little visual evidence that the last step worked, and it keeps checking.

**What might help.** Adding a separate failure or request-for-help response, and stating in the prompt what a finished task looks like. -->

### Time and token cost

Astra's inference is both time- and token-intensive. Across all tasks and episodes, each Codex turn takes an average of ** seconds and consumes ** tokens. This amounts to ** tokens per minute of execution, with inference accounting for **% of the total runtime.

<!-- **What we saw.** Episodes were slow, and much of the time went into **small corrections**. Placements that would already have worked were followed by further small adjustments (*"Retracting cup slightly"*). In the worst case, a fold-clothes episode spent roughly **20 minutes** trying to fold the bottom of the hoodie upward without making progress.

**Why we think it happens.** By default Astra sends **one small relative move per model turn**, and every turn waits for fresh camera frames and a full model response. Nothing in the prompt says how close is close enough, so each new frame invites another small correction, and each correction costs a full turn. Every extra adjustment near the machine is also another chance to bump it.

**What might help.** Giving explicit tolerances for placements ("within a centimeter is fine"), and action chunking. In the toy clean-up task, chunking made episodes **much faster**, but it also made contact more frequent. We discuss that trade-off in [Case Study & Ablations](#case-study-ablations).

*"Grab the apple from the kitchen and bring it to the couch."*

After the apple dropped, Astra detected the failure but was slow to re-plan and resume. It does retry, so recovery itself is not the problem. The delay between detecting the failure and issuing the next corrective action is long. -->

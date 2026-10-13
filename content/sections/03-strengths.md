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

#### It actively gathers information it needs

Actively looking for user and handover

#### It plans over long-horizon, and replans when necessary

Make coffee: right reasoning & planning over steps

open drawer over and over again

clean up toys

### Coordination of mobility and manipulation

We found AaP is able to appropriately control both the mobile base and the arm simultaneously, better utilizing both capabilities to achieve tasks.

Open cabinet requires moving the base and the arm together to pull the door.

Design a case: the target location is initially unreachable by directly extending arm; desired behavior: AaP first tried fully extending arm -> move base directly towards it rejected by obstacle avoidance -> try to move around

### High language steerablity and adaptation

Close oven door.
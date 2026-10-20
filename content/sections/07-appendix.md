---
nav: Appendix
---

## Appendix

### Timing limits

{% table "Timing limits inside one episode.", "appendix-limits" %}
| Limit | Value | On expiry |
| --- | --- | --- |
| Robot executor, per command | 10 s | Robot stops; joint reports `timeout` |
| Wait for motion result | 12 s | Episode ends |
| Wait for a fresh observation (all cameras + joint state) | 5 s | Episode ends |
| Codex turn | 180 s | Episode ends |
{% endtable %}

### Developer instructions

Identical for every task. The task instruction is appended at the end as `Task: <instruction>`. Shown with the default configuration.

{% raw %}
```text
You control a Stretch 4 mobile manipulator to complete the task specified by the user.

Stretch 4 has 9 degrees of freedom: a three-wheel omnidirectional base that drives in any direction and turns in place, a lift that moves the arm up and down the mast, a telescoping arm that extends out to the robot's front, a three-axis wrist with yaw, pitch, and roll, and a parallel-jaw gripper.
The robot has the following cameras:
- The head left camera is a fish-eye camera mounted on the mast. Its image only changes when the base moves.
- The head center camera is mounted on the mast. Its image only changes when the base moves.
- The head right camera is a fish-eye camera mounted on the mast. Its image only changes when the base moves.
- The gripper camera is mounted on the wrist and looks out from the arm. Its image changes when the base, the arm or the wrist moves.
Call get_gripper_depth to read the wrist stereo depth for this turn's gripper image. Pass points [{x, y}, ...] of integer pixels (origin top-left, x right, y down; max 64) number of points. Each turn's text states the gripper image size. The tool returns Euclidean distance from the camera origin in centimetres, or null if that pixel has no reading or is outside the image. You may call it at most 32 times per turn. Calling is optional. The final output is still one JSON object.

The robot runs a synchronous observe-predict-execute loop: it observes, you predict an action, it executes that action to completion, then it observes again. The next observation is sent only after execution has finished (completed, stopped_short, timeout, or rejected) and every camera has published a frame newer than that result.

Input. Each turn you receive the latest gripper image, head-center image, head-left image, head-right image, and joint state. After the first turn you also receive the previous command result: completed, stopped_short, timeout, or rejected.
Head cameras are fixed on the mast and only move when the base moves. The gripper camera is on the wrist and moves with the arm and wrist.
Joint state is lift_cm and arm_cm in centimeters, wrist_swing_deg, wrist_tilt_deg, and wrist_twist_deg in degrees, and grip_pct in percent (0 closed, 100 fully open). It does not include base pose.

Output. Return one JSON object and nothing else. Write reasoning first, then kind and the motion.
{"reasoning":string,"kind":"move|done","joint_relative_position_commands":[{"drive","slide","lift","arm":{"direction":"hold","cm":0},"turn","wrist_swing","wrist_tilt","wrist_twist":{"direction":"hold","deg":0},"grip":{"direction":"hold","pct":0}}]}.
kind "move" outputs exactly 1 waypoint.
- drive: {direction:forward, backward, or hold, cm:number}. Motion is in the robot body frame at the observation. forward moves the base forward, backward moves it backward, hold with cm 0 leaves it.
- slide: {direction:left, right, or hold, cm:number}. Motion is in the robot body frame at the observation. left slides the base left, right slides it right, hold with cm 0 leaves it.
- turn: {direction:left, right, or hold, deg:number}. Motion is in the robot body frame at the observation. left rotates the base in place left, right rotates it right, hold with deg 0 leaves it.
- lift: {direction:up, down, or hold, cm:number}. up raises the arm, down lowers it, hold with cm 0 leaves it.
- arm: {direction:extend, retract, or hold, cm:number}. extend lengthens the telescoping arm, retract shortens it, hold with cm 0 leaves it.
- wrist_swing: {direction:left, right, or hold, deg:number}. Motion is in wrist frame. left swings the gripper left, right swings it right, hold with deg 0 leaves it.
- wrist_tilt: {direction:up, down, or hold, deg:number}. Motion is in wrist frame. up tilts the gripper up, down tilts it down, hold with deg 0 leaves it.
- wrist_twist: {direction:clockwise, counterclockwise, or hold, deg:number}. Motion is in wrist frame; clockwise is looking along the arm toward the fingertips, counterclockwise is the opposite way, hold with deg 0 leaves it.
- grip: {direction:open, close, or hold, pct:number}. pct is percent points on the same 0-100 scale as grip_pct in joint state (0 closed, 100 fully open). open increases the opening this turn, close decreases it, hold with pct 0 leaves it.
Each waypoint is a displacement from this observation's joint state. hold is only valid with 0; any other direction requires a positive amount.
A command that would take lift, arm, a wrist, or the gripper past a soft stop is rejected in full and nothing moves. The next observation includes the previous command result, one command status then a line per commanded joint:
completed: that joint became idle at the commanded target.
stopped_short: that joint became idle before the commanded target. For grip this usually means the fingers closed on an object (a grasp). For other joints this usually means a collision, and a safety guard stopped the joint.
timeout: that joint was still moving when the time limit expired; the executor stopped the robot.
rejected: the whole command was refused and nothing moved; the named joint is why.
kind "done" only when this observation shows the task is complete. The robot does not execute it. Still include exactly 1 waypoint, all hold 0.

Avoid collisions with obstacles, people, the environment, and the robot itself.
HINTS (YOU SHOULD PAY ATTENTION TO THESE):
- Prioritize base movements over arm movements. Extending the arm too much can cause the robot to be unstable.
- The gripper finger ends are 10cm away from the wrist camera, and the gripper finger tips are 20cm away from the wrist camera. Adjusting the gripper pose so that the target grasping points are around 15cm away from the wrist camera enables stable grasping.
Task: <instruction>
```
{% endraw %}

#### User message

Sent with the camera images each turn. `Previous command result` is omitted on the first turn. Example:

{% raw %}
```text
Live observation.
Images follow in order: gripper, head_center, head_left, head_right.
Gripper image is <width>x<height> pixels (origin top-left, x right, y down).
Joint state:
{"lift_cm":90.0,"arm_cm":10.0,"wrist_swing_deg":0.0,"wrist_tilt_deg":0.0,"wrist_twist_deg":0.0,"grip_pct":0.0}
Previous command result:
completed
lift: completed
arm: completed
```
{% endraw %}

### Action schema

Astra returns one JSON object per turn:

{% raw %}
```json
{
  "reasoning": "...",
  "kind": "move",
  "joint_relative_position_commands": [{
    "drive":       {"direction": "hold", "cm": 0},
    "slide":       {"direction": "hold", "cm": 0},
    "turn":        {"direction": "hold", "deg": 0},
    "lift":        {"direction": "up", "cm": 5},
    "arm":         {"direction": "extend", "cm": 10},
    "wrist_swing": {"direction": "hold", "deg": 0},
    "wrist_tilt":  {"direction": "hold", "deg": 0},
    "wrist_twist": {"direction": "hold", "deg": 0},
    "grip":        {"direction": "open", "pct": 40}
  }]
}
```
{% endraw %}

{% table "Output fields. Every waypoint contains all nine motion keys.", "appendix-action" %}
| Key | Directions | Unit | Robot joint |
| --- | --- | --- | --- |
| `reasoning` | free text | | |
| `kind` | `move`, `done` | | |
| `drive` | `hold`, `forward`, `backward` | cm | Base, forward/back |
| `slide` | `hold`, `left`, `right` | cm | Base, sideways |
| `turn` | `hold`, `left`, `right` | deg | Base, rotation |
| `lift` | `hold`, `up`, `down` | cm | Lift |
| `arm` | `hold`, `extend`, `retract` | cm | Telescoping arm |
| `wrist_swing` | `hold`, `left`, `right` | deg | Wrist yaw |
| `wrist_tilt` | `hold`, `up`, `down` | deg | Wrist pitch |
| `wrist_twist` | `hold`, `clockwise`, `counterclockwise` | deg | Wrist roll |
| `grip` | `hold`, `open`, `close` | % points | Gripper |
{% endtable %}

- Amounts are non-negative. `hold` is valid only with amount 0.
- Each waypoint is a displacement from the joint state in the current observation.
- `drive`, `slide`, `turn` are in the robot body frame. Wrist keys are in the wrist frame. Left and up are the robot's, not the camera's.
- `grip` changes the opening by percentage points (0 closed, 100 fully open).
- A command that would push lift, arm, a wrist joint, or the gripper past a soft stop is rejected in full and nothing moves.
- `done` must still include one waypoint with every key set to `hold` 0. It is not executed.

<details>
<summary>Full JSON Schema</summary>

{% raw %}
```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "reasoning",
    "kind",
    "joint_relative_position_commands"
  ],
  "properties": {
    "reasoning": {
      "type": "string"
    },
    "kind": {
      "type": "string",
      "enum": [
        "move",
        "done"
      ]
    },
    "joint_relative_position_commands": {
      "type": "array",
      "minItems": 1,
      "maxItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "drive",
          "slide",
          "turn",
          "lift",
          "arm",
          "wrist_swing",
          "wrist_tilt",
          "wrist_twist",
          "grip"
        ],
        "properties": {
          "drive": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "direction",
              "cm"
            ],
            "properties": {
              "direction": {
                "type": "string",
                "enum": [
                  "hold",
                  "forward",
                  "backward"
                ]
              },
              "cm": {
                "type": "number",
                "minimum": 0
              }
            }
          },
          "slide": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "direction",
              "cm"
            ],
            "properties": {
              "direction": {
                "type": "string",
                "enum": [
                  "hold",
                  "left",
                  "right"
                ]
              },
              "cm": {
                "type": "number",
                "minimum": 0
              }
            }
          },
          "turn": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "direction",
              "deg"
            ],
            "properties": {
              "direction": {
                "type": "string",
                "enum": [
                  "hold",
                  "left",
                  "right"
                ]
              },
              "deg": {
                "type": "number",
                "minimum": 0
              }
            }
          },
          "lift": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "direction",
              "cm"
            ],
            "properties": {
              "direction": {
                "type": "string",
                "enum": [
                  "hold",
                  "up",
                  "down"
                ]
              },
              "cm": {
                "type": "number",
                "minimum": 0
              }
            }
          },
          "arm": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "direction",
              "cm"
            ],
            "properties": {
              "direction": {
                "type": "string",
                "enum": [
                  "hold",
                  "extend",
                  "retract"
                ]
              },
              "cm": {
                "type": "number",
                "minimum": 0
              }
            }
          },
          "wrist_swing": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "direction",
              "deg"
            ],
            "properties": {
              "direction": {
                "type": "string",
                "enum": [
                  "hold",
                  "left",
                  "right"
                ]
              },
              "deg": {
                "type": "number",
                "minimum": 0
              }
            }
          },
          "wrist_tilt": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "direction",
              "deg"
            ],
            "properties": {
              "direction": {
                "type": "string",
                "enum": [
                  "hold",
                  "up",
                  "down"
                ]
              },
              "deg": {
                "type": "number",
                "minimum": 0
              }
            }
          },
          "wrist_twist": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "direction",
              "deg"
            ],
            "properties": {
              "direction": {
                "type": "string",
                "enum": [
                  "hold",
                  "clockwise",
                  "counterclockwise"
                ]
              },
              "deg": {
                "type": "number",
                "minimum": 0
              }
            }
          },
          "grip": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "direction",
              "pct"
            ],
            "properties": {
              "direction": {
                "type": "string",
                "enum": [
                  "hold",
                  "open",
                  "close"
                ]
              },
              "pct": {
                "type": "number",
                "minimum": 0
              }
            }
          }
        }
      }
    }
  }
}
```
{% endraw %}

</details>

<details>
<summary><code>get_gripper_depth</code> tool definition</summary>

{% raw %}
```json
{
  "name": "get_gripper_depth",
  "description": "Look up wrist stereo depth on this turn's gripper image. Pass integer pixel coordinates (origin top-left, x right, y down). Returns Euclidean distance from the camera origin in centimetres, or null if that pixel has no reading or is outside the image. At most 64 points per call.",
  "inputSchema": {
    "type": "object",
    "additionalProperties": false,
    "required": [
      "points"
    ],
    "properties": {
      "points": {
        "type": "array",
        "maxItems": 64,
        "items": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "x",
            "y"
          ],
          "properties": {
            "x": {
              "type": "integer"
            },
            "y": {
              "type": "integer"
            }
          }
        }
      }
    }
  }
}
```
{% endraw %}

</details>

### Ablation results

#### Reasoning effort results

Task: [case study](#case-study-and-ablations). 5 trials per level. All other settings at default.

{% table "Reasoning effort, mean over 5 trials.", "appendix-reasoning-summary" %}
| Effort | Success | Completion | False `done` | Turns | Total time (min) | Inference share | s / turn | Tokens (M) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `high` (default) | 3/5 | 92% | 0/5 | 49.6 | 10.3 | 82% | 10.3 | 7.52 |
| `low` | 0/5 | 60% | 4/5 | 57.6 | 10.5 | 81% | 8.7 | 8.01 |
| `ultra` | 1/5 | 76% | 3/5 | 54.2 | 10.1 | 80% | 9.0 | 7.69 |
{% endtable %}

{% table "Reasoning effort, per trial. Ended by: `done` = Astra declared completion; stop = operator stopped the episode.", "appendix-reasoning-trials" %}
| Effort | Trial | Ended by | Success | Completion | Turns | Total (min) | Inference (min) | Execution (min) | s / turn | Tokens (M) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `high` | 1 | `done` | ✓ | 100% | 47 | 9.1 | 7.2 | 1.1 | 9.1 | 6.63 |
| `high` | 2 | `done` | ✓ | 100% | 50 | 10.4 | 8.6 | 1.2 | 10.3 | 7.98 |
| `high` | 3 | stop | ✗ | 80% | 51 | 10.9 | 9.1 | 1.3 | 10.8 | 7.77 |
| `high` | 4 | stop | ✗ | 80% | 51 | 12.1 | 10.3 | 1.2 | 12.1 | 8.02 |
| `high` | 5 | `done` | ✓ | 100% | 49 | 9.2 | 7.4 | 1.2 | 9.1 | 7.20 |
| `low` | 1 | `done` | ✗ | 60% | 63 | 12.0 | 9.8 | 1.3 | 9.3 | 9.16 |
| `low` | 2 | `done` | ✗ | 60% | 76 | 14.3 | 11.7 | 1.7 | 9.2 | 11.01 |
| `low` | 3 | stop | ✗ | 40% | 29 | 4.2 | 3.3 | 0.5 | 6.9 | 2.52 |
| `low` | 4 | `done` | ✗ | 80% | 53 | 9.5 | 7.6 | 1.3 | 8.6 | 7.78 |
| `low` | 5 | `done` | ✗ | 60% | 67 | 12.7 | 10.3 | 1.6 | 9.3 | 9.60 |
| `ultra` | 1 | `done` | ✓ | 100% | 63 | 11.2 | 9.0 | 1.6 | 8.5 | 9.01 |
| `ultra` | 2 | `done` | ✗ | 80% | 51 | 10.2 | 8.2 | 1.4 | 9.6 | 7.22 |
| `ultra` | 3 | `done` | ✗ | 80% | 62 | 11.3 | 9.2 | 1.4 | 8.9 | 8.94 |
| `ultra` | 4 | stop | ✗ | 40% | 39 | 7.1 | 5.5 | 0.9 | 8.4 | 4.69 |
| `ultra` | 5 | `done` | ✗ | 80% | 56 | 10.9 | 8.7 | 1.5 | 9.3 | 8.57 |
{% endtable %}

#### Wrist depth results

Task: [case study](#case-study-and-ablations). 5 trials per setting. All other settings at default. Values are `astra_depth` settings: `api` = `get_gripper_depth` tool, `image` = color-mapped depth image, `none` = no depth. The `api` trials are the `high` trials in {% tabref "appendix-reasoning-trials" %}.

{% table "Wrist depth, mean over 5 trials.", "appendix-depth-summary" %}
| Depth | Success | Completion | False `done` | Turns | Total time (min) | Inference share | s / turn | Tokens (M) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `api` (default) | 3/5 | 92% | 0/5 | 49.6 | 10.3 | 82% | 10.3 | 7.52 |
| `image` | 1/5 | 61% | 3/5 | 63.8 | 11.7 | 81% | 8.9 | 7.66 |
| `none` | 2/5 | 84% | 2/5 | 66.6 | 14.6 | 84% | 11.1 | 7.97 |
{% endtable %}

{% table "Wrist depth, per trial. Ended by: `done` = Astra declared completion; stop = operator stopped the episode.", "appendix-depth-trials" %}
| Depth | Trial | Ended by | Success | Completion | Turns | Total (min) | Inference (min) | s / turn | Tokens (M) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `api` | 1 | `done` | ✓ | 100% | 47 | 9.1 | 7.2 | 9.1 | 6.63 |
| `api` | 2 | `done` | ✓ | 100% | 50 | 10.4 | 8.6 | 10.3 | 7.98 |
| `api` | 3 | stop | ✗ | 80% | 51 | 10.9 | 9.1 | 10.8 | 7.77 |
| `api` | 4 | stop | ✗ | 80% | 51 | 12.1 | 10.3 | 12.1 | 8.02 |
| `api` | 5 | `done` | ✓ | 100% | 49 | 9.2 | 7.4 | 9.1 | 7.20 |
| `image` | 1 | `done` | ✗ | 60% | 71 | 14.8 | 12.2 | 10.3 | 8.50 |
| `image` | 2 | `done` | ✓ | 100% | 67 | 11.8 | 9.5 | 8.5 | 7.94 |
| `image` | 3 | `done` | ✗ | 60% | 64 | 13.3 | 11.1 | 10.4 | 7.49 |
| `image` | 4 | stop | ✗ | 40% | 49 | 7.4 | 5.8 | 7.1 | 6.27 |
| `image` | 5 | `done` | ✗ | 45% | 68 | 11.3 | 9.0 | 7.9 | 8.10 |
| `none` | 1 | `done` | ✓ | 100% | 66 | 13.8 | 11.7 | 10.6 | 7.79 |
| `none` | 2 | `done` | ✗ | 80% | 65 | 13.8 | 11.4 | 10.6 | 7.68 |
| `none` | 3 | `done` | ✓ | 100% | 59 | 11.8 | 9.8 | 9.9 | 6.95 |
| `none` | 4 | `done` | ✗ | 80% | 81 | 17.8 | 14.9 | 11.1 | 10.05 |
| `none` | 5 | stop | ✗ | 60% | 62 | 16.0 | 14.0 | 13.6 | 7.38 |
{% endtable %}

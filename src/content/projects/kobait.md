---
name: KObait
order: 5
tier: A
accent: kobait
kicker: Embedded remote-control boat
signature: 'A lost radio link stops the boat, and tests guard the safety rules in front of the motors.'
summary: 'A two-board embedded system for a bait boat: a handheld remote and a boat controller joined by a radio protocol of my own, with safety gates in front of the motors.'
description: 'Case study of KObait: a remote-controlled bait boat with a handheld remote, a radio link of my own design and safety gates in front of the motors. Bench-tested.'
seoTitle: 'KObait: remote-control bait boat'
status: prototype
statusNote: Bench-tested, not yet on the water
started: 2026-03
role: Hardware integration, firmware for both boards, protocol design and test tooling
context: Personal hardware project
layers: [hardware]
stack: [cpp, arduino, python]
links:
  repoNote: Private repository
spec:
  - { label: Boards, value: 'Two: a boat controller and a handheld remote' }
  - { label: Radio, value: 'Long-range link with a protocol of my own' }
  - { label: Safety, value: 'A lost link stops the boat; gates in front of the motors' }
  - {
      label: Firmware,
      value: 'C++; about 4,500 lines on the boat, 14,000 on the remote, partly generated',
    }
  - { label: Tests, value: 'Host-side check scripts and 24 bench diagnostic sketches' }
highlights:
  - Only one part of the code may drive the motors, and tests enforce it.
  - A lost radio link stops the boat. Autonomous return is deliberately not built until it is an explicit decision.
  - The radio timing comes from a measured round trip, not from a datasheet.
built:
  - title: Boat controller
    points:
      - 'Firmware organised around safety: explicit modes, a stated reason for every stop and gates in front of the motors.'
      - Waypoint navigation to saved points, gated off until its sensor is verified.
      - Leak and battery alarms, a hardware watchdog and release hatches for the bait.
  - title: Radio and protocol
    points:
      - 'A protocol of my own over a transparent radio: framed, checked, paired and tolerant of noise.'
      - Commands that are acknowledged, so each one is carried out exactly once.
      - A schedule that keeps the two radios from talking over each other.
  - title: Handheld remote
    points:
      - A remote with its own screen and UI, built on a framework I wrote for a very small memory budget.
      - A calibrated joystick and a safe arming sequence. The output stays at zero until the stick is healthy and centred.
  - title: Tooling
    points:
      - Single-purpose bench sketches for every part of the hardware.
      - Host-side Python checks for architecture rules, control logic and protocol behaviour.
diagrams: [kobait-system]
architecture: Two boards joined by a radio link. On the boat, the safety logic has the last word over anything the remote asks for.
hard:
  - title: Radio collisions that looked like dead hardware
    problem: The first radio link looked like a dead uplink, even though both modules powered up and answered.
    solution: Separate test runs showed that every loss was two transmitters talking over each other. A schedule fixed it, with full delivery and zero checksum errors on the bench.
  - title: Timing from measured air time
    problem: A measured radio round trip made the original control rate and failsafe timeout physically impossible.
    solution: I re-derived every timing constant from the measurement. The trade-off, some metres of coasting before the failsafe stop, is documented as an estimate, not a measurement.
  - title: Stale commands after a reboot
    problem: A remote reboot restarted its counters, so the boat could reject frames or treat an old command as a fresh success.
    solution: The boat re-baselines once per outage and the remote ignores stale echoes. A session-aware protocol is designed but not yet built.
decisions:
  - decision: Range over water, with framing of my own.
    why: The radio is transparent. It has no packets, checksums or acknowledgements, so the firmware provides them.
  - decision: Stop, not return-to-home, when the link is lost.
    why: Autonomous movement after losing contact is a product decision that needs an explicit yes, not a default.
  - decision: A custom UI framework instead of an off-the-shelf one.
    why: The usual libraries need far more memory than the board has, and there is no framebuffer. The framework repaints only the regions that changed.
  - decision: Optional parts are non-critical.
    why: A display failure once left the boat in an infinite loop with the motor controllers live. Now the boat runs without a display, or without AUTO, instead of halting.
  - decision: The pairing ID is isolation, not authentication.
    why: It keeps two boats from answering each other's remote. It is not a security boundary, and the protocol documentation says so.
now:
  - Both boards run their firmware on the bench, and the radio link has been verified in both directions on a desk.
  - Positioning, displays, the remote UI, joystick calibration and sensor baselines are verified on the bench.
  - AUTO is gated off in firmware because one sensor does not respond on the current bench wiring.
  - A second version of the remote interface is written, with a dashboard, a side menu with saved settings and text in five languages, but it has not been flashed to the bench hardware yet. An offline map is a separate prototype.
next:
  - Motor controller characterisation with measured endpoints, then staged tests with motors, props and restraint, and a tethered water test.
  - Outdoor range testing.
  - A session-aware protocol and a decision on return-to-home.
learned:
  - Measure before you tune. The radio's real round trip rewrote every timing constant.
  - On a machine with propellers, safety is structure. One place that can drive the motors, one owner of the mode, and tests that keep it that way.
  - Writing down what has not been tested yet (no water test, no range test) is part of the engineering, not an admission.
notes:
  - No photos of the hardware are published yet. The plate at the top of this page is a schematic illustration, not a render of the boat.
---

KObait is a remote-controlled bait boat for fishing. It carries bait out over the water, remembers saved waypoints and releases the bait through hatches. It is also my hardware lab, the place where software habits such as single ownership, explicit contracts and tests meet wiring, radios and batteries.

**Where it is now.** The system was rebuilt from its first generation into a two-board system with a long-range radio link and a screen on the remote. It is a bench prototype. The radio, displays, positioning and control logic work on the desk, and it has not yet been in the water.

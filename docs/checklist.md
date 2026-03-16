# Checklist

<!-- Tree structure. Mark done with [x], pending with [ ]. -->

```
├── [x] User telecaller done
│   ├── [x] Direct leads assigned ka modal done
│   └── [ ] Auto leads assign modal pending
└── [ ] Root flow — ye do roots hain
    ├── Not Connected
    │   └── Branch: No Answer
    │       └── Cycle: No Answer — actions only
    │           ├── Schedule callback — Auto (Attempt 1: 2h, Attempt 2: 8h, Attempt 3: 12h)
    │           ├── Call Now
    │           ├── Overdue
    │           ├── Move to New Assigned (4th hold)
    │           ├── Shift logic: callback time user ke shift ke andar (start–end); week-off/leave skip; agar time shift start se pehle to shift start pe clamp; overnight shift (e.g. 22:00–04:00) support
    │           └── Token system: per user, per date (callback date); 5-min slot resolve → token 1, 2, 3… (order us din); display "token · date" (e.g. 1 · 7 Mar)
    └── Connected
```

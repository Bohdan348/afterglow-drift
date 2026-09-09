# AFTERGLOW Drift — Blender Modeler Skills

## Scope

Arcade low-poly drift racing game. Three.js + GLB export. WebGL-optimized.
Targets: characters, cars, landscape cities.

---

## GLB Loader Requirements (car-multi-glb.ts)

The game auto-detects 4 wheels by geometric heuristics. Every car GLB **must** satisfy:

| Rule | Detail |
|------|--------|
| **Wheel count** | Exactly 4 separate meshes |
| **Wheel shape** | Thin along local X, round in YZ (torus/cylinder) |
| **Wheel height** | Low Y (bottom of car, close to ground) |
| **Wheel clustering** | Parts within 0.75 units are grouped into one wheel |
| **Wheel order** | Loader outputs: `[frontLeft, rearLeft, frontRight, rearRight]` |
| **Tail light** | At least one mesh named `red_glass` or containing `taillight`/`tail` |
| **Orientation** | Front of car toward -Z |
| **Pivot** | Body centered at origin, tires touch Y=0 |
| **Scale** | `VEHICLE_SCALE = 1.1` applied by game. Export at ~4.4m length. |

### Naming Convention

```
Body          — main shell mesh
Tire0..3      — wheel tire meshes
Rim0..3       — wheel rim meshes  
Headlight     — front emissive
Taillight     — rear emissive (name MUST match /red_glass|taillight|tail/i)
Cabin         — glass/canopy
```

---

## Low-Poly Budget

| Asset | Triangle Target |
|-------|----------------|
| Car (low-poly) | 1,500–4,000 |
| Car (detailed) | 4,000–8,000 |
| Character | 500–3,000 |
| Building | 200–1,200 |
| Tree | 200–800 |
| Prop | 50–500 |

---

## Modeling Rules

### Geometry
- No subdivision surfaces
- No multi-segment bevels (0 or 1 segment max)
- Flat shading OR auto-smooth at 60°+
- Merge coplanar faces
- Apply all transforms before export (scale 1,1,1)
- No loose vertices, no interior faces, no non-manifold edges

### Materials
- Use `Principled BSDF` only
- Max 4–6 materials per car (body, glass, tire, rim, headlight, taillight)
- Emissive only for lights (headlights, taillights, neon underglow)
- Roughness: glass 0.05, body 0.3–0.5, tire 0.8–0.95, rim 0.1–0.2
- Metallic: rim 0.8–1.0, body 0.1–0.3, glass 0.5–0.7

### Wheel Construction
- Tire: torus or low-poly cylinder (8–12 segments)
- Rim: cylinder inside tire (4–8 segments)
- Wheel axis along X (rotates around X for rolling)
- Each wheel = separate Group containing tire + rim meshes

### Export Settings (Blender → GLB)
```
Format: GLB (binary)
Apply Scalings: All
Forward: -Z
Up: Y
Include: Selected Objects only
Apply Modifiers: ON
```

---

## Validation Checklist

Before export, verify:

- [ ] Triangle count within budget
- [ ] No NaN in vertex positions
- [ ] All transforms applied (scale = 1,1,1)
- [ ] Exactly 4 wheel meshes detected
- [ ] Wheel positions: 2 front (-Z), 2 rear (+Z)
- [ ] Wheel Y positions near ground (0)
- [ ] At least one `red_glass`/`taillight` mesh for brake glow
- [ ] Body centered at origin
- [ ] Front of car faces -Z
- [ ] No overlapping geometry / z-fighting
- [ ] Materials named consistently

---

## Car Archetypes (HANDLING personality → shape)

| Type | Handling | Shape Language |
|------|----------|---------------|
| **Coupe** | Balanced drift | Low, wide, sleek hood |
| **Porsche** | Sharp entry/exit | Curved rear, wide haunches |
| **GT (M8)** | High grip, planted | Long hood, wide stance |
| **GT3 (M4)** | Fastest, on rails | Aggressive aero, splitter |
| **Muscle** | Loose tail, slides | Boxy, big hood scoop |
| **Bike** | Lean physics | Not a car — separate loader |

---

## Pipeline

```
1. Blockout (boxes/cylinders) — proportion check
2. Detail pass — panel lines, scoops, lights
3. Wheels — separate objects, correct positions
4. Materials — assign, name, set properties
5. Validation — polycount, transforms, naming
6. Export GLB — test in game loader
7. Screenshot — show to user for approval
```

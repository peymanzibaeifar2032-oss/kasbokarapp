# Moving apprentice progress (1.6.1)

- `ApprenticeProgress.kt` draws the class progress: rounded full-width bar, light turquoise done part,
  dark grey remainder, RTL (0% at the right, filling left). The apprentice figure stands on the filled
  edge with its centre on the current percentage (clamped so it is never cut off); the big turquoise
  Persian percentage rides above its head. No percentage beside the bar. 750 ms ease animation; a short
  glow at 100%.
- Used on the «پیشرفت من» card (home and progress page), each part band on the home list and each
  part card on the progress page (compact size).
- Icon: `tattoo-progress-icon.png` (transparent, tight crop) keyed from the magenta source art with
  `tools/key_progress_icon.py`; density copies live in `res/drawable-*/tattoo_progress_icon.png` (52dp tall).
- Debug builds only (`src/debug/.../Hooks.kt`) can render the real screens from a made-up index for
  screenshots: `adb shell am start -n com.kasbokar.tattooclass/.MainActivity --ei preview_total 42 --ei preview_done 2
  [--es preview_screen progress] [--ez preview_glow true] [--es preview_capture NAME]`.
  The release build ships a no-op `src/release/.../Hooks.kt`.

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "output" / "map_renders" / "areshnaat-faux-satellite-8k.png"
OUTPUT = ROOT / "output" / "map_renders" / "areshnaat-rotating-globe.gif"


def make_globe_frames(texture: Image.Image, frame_count: int = 48, size: int = 720) -> list[Image.Image]:
    texture = texture.convert("RGB")
    tex = np.asarray(texture, dtype=np.uint8)
    tex_h, tex_w = tex.shape[:2]

    yy, xx = np.mgrid[0:size, 0:size]
    cx = cy = (size - 1) / 2.0
    radius = size * 0.43

    nx = (xx - cx) / radius
    ny = (yy - cy) / radius
    rr2 = nx * nx + ny * ny
    inside = rr2 <= 1.0
    nz = np.zeros_like(nx)
    nz[inside] = np.sqrt(1.0 - rr2[inside])

    # Fixed viewer-space light for a soft orbital look.
    light = np.array([-0.45, -0.25, 0.86], dtype=np.float32)
    light /= np.linalg.norm(light)

    frames: list[Image.Image] = []

    for frame_index in range(frame_count):
        phase = 2.0 * math.pi * frame_index / frame_count

        # Rotate the sphere around the vertical axis.
        world_x = nx * math.cos(phase) + nz * math.sin(phase)
        world_y = ny
        world_z = -nx * math.sin(phase) + nz * math.cos(phase)

        lon = np.arctan2(world_x, world_z)
        lat = np.arcsin(np.clip(world_y, -1.0, 1.0))

        u = (lon / (2.0 * math.pi) + 0.5) % 1.0
        v = 0.5 - lat / math.pi

        tex_x = np.clip((u * (tex_w - 1)).astype(np.int32), 0, tex_w - 1)
        tex_y = np.clip((v * (tex_h - 1)).astype(np.int32), 0, tex_h - 1)

        frame = np.zeros((size, size, 4), dtype=np.uint8)

        sampled = tex[tex_y, tex_x].astype(np.float32)

        lambert = (
            world_x * light[0]
            + world_y * light[1]
            + world_z * light[2]
        )
        lambert = np.clip(lambert, 0.0, 1.0)
        shade = 0.33 + 0.67 * lambert

        rim = np.clip(1.0 - np.sqrt(np.clip(rr2, 0.0, 1.0)), 0.0, 1.0)
        atmosphere = np.clip((1.0 - rim) ** 2.2, 0.0, 1.0)

        shaded = sampled * shade[..., None]
        # A slight cool atmospheric lift near the limb.
        shaded[..., 2] += 42.0 * atmosphere
        shaded[..., 1] += 18.0 * atmosphere
        shaded = np.clip(shaded, 0.0, 255.0)

        frame[..., :3] = shaded.astype(np.uint8)
        frame[..., 3] = np.where(inside, 255, 0).astype(np.uint8)

        image = Image.fromarray(frame, mode="RGBA")

        shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        shadow_alpha = np.zeros((size, size), dtype=np.uint8)
        shadow_alpha[inside] = np.clip((rr2[inside] ** 1.7) * 36, 0, 36).astype(np.uint8)
        shadow.putalpha(Image.fromarray(shadow_alpha, mode="L").filter(ImageFilter.GaussianBlur(8)))

        background = Image.new("RGBA", (size, size), (4, 11, 20, 255))
        background.alpha_composite(shadow, dest=(16, 18))
        background.alpha_composite(image)
        frames.append(background.convert("P", palette=Image.ADAPTIVE, colors=255))

    return frames


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Source texture not found: {SOURCE}")

    texture = Image.open(SOURCE)
    frames = make_globe_frames(texture)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=frames[1:],
        duration=70,
        loop=0,
        optimize=False,
        disposal=2,
    )

    print(
        {
            "source": str(SOURCE),
            "output": str(OUTPUT),
            "frames": len(frames),
            "size": frames[0].size,
        }
    )


if __name__ == "__main__":
    main()

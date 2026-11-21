# Prompts for generating the plant icons

Goal: 14 icons in the same style as the reference (the 3D monstera with the green-rimmed pot). Generate them all **in the same chat** of the image generator (ChatGPT, Gemini…), attaching the reference image to the first message, so the style stays consistent.

## First message (attach the reference image)

```
I'm creating a set of 14 app icons for houseplants. Use the attached image as the exact style reference for ALL of them:
- soft 3D clay / glossy plastic render, rounded smooth shapes, subtle embossed leaf veins
- soft studio lighting from the top-left, gentle shadows, no harsh reflections
- the SAME pot in every icon: terracotta pot with a thick sage-green rim, like the reference
- 3/4 front view, plant centered, whole plant and pot visible, same scale and framing
- transparent background (PNG), no text, no ground shadow, square 1024x1024
Reply only with the image. Let's start with: [PLANT 1 below]
```

## Following messages (one per plant)

`Next one, same style, same pot, same framing: <description>`

| File | Plant | Description for the prompt |
|---|---|---|
| `sterlizia.png` | Sterlizia | Strelitzia (bird of paradise): long upright paddle-shaped leaves on long stalks, one orange and blue bird-of-paradise flower |
| `monstera.png` | Monstera | Monstera deliciosa: 3 large heart-shaped leaves with deep splits and holes (like the reference — you can use the reference image directly) |
| `monstera-monkey.png` | Monstera Monkey | Monstera adansonii: climbing/trailing vines with many smaller oval leaves full of oval holes, some vines hanging over the pot rim |
| `ficus-elastica.png` | Ficus Elastica | Rubber plant: one upright woody stem with thick, glossy, oval dark green leaves, a reddish new leaf sheath at the top |
| `calathea.png` | Calathea | Calathea: oval upright leaves, light green with dark green feathered markings along the midrib, purple undersides on some leaves |
| `tradescantia.png` | Tradescantia (camera + salotto) | Tradescantia pallida 'Purpurea': elongated pointed deep purple leaves on fleshy trailing stems, a few small pink three-petal flowers |
| `spatafillo.png` | Spatafillo | Peace lily (Spathiphyllum): glossy dark green lance-shaped leaves, 2–3 white spathe flowers on tall stems |
| `calla.png` | Calla | Calla lily (Zantedeschia): arrow-shaped leaves with small white spots, 2 trumpet-shaped calla flowers |
| `pilea.png` | Pilea | Pilea peperomioides: round flat coin-shaped leaves on thin stalks radiating from a central stem |
| `potho.png` | Potho | Golden pothos: heart-shaped green leaves with yellow variegation, vines trailing over the pot rim |
| `stella-di-natale.png` | Stella di Natale | Poinsettia: red star-shaped bracts on top of green leaves, small yellow centers |
| `pachira.png` | Pachira | Money tree (Pachira aquatica): braided trunk, palmate leaves with 5–7 leaflets on top |
| `cactus.png` | Cactussino | A small cute cactus |
| `giglio-leopardo.png` | Giglio Leopardo | *(to be defined — which plant is it exactly?)* |

## Afterwards
Save the images into `icons/originali/` with the names above (`monstera` is already there). I'll take care of the rest with `scripts/prepara_icone.py`: trimming the margins, resizing to 512px, transparent background, WebP.

Tip: always ask for a **transparent background**. ChatGPT supports it; if a generator gives you a white background it still works, but the "holes" in the leaves (e.g. Monstera Monkey) need a pass with `--buchi`.

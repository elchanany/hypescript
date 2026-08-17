"use client";

import { useState } from "react";
import { Blend, Captions, Film, Layers, Palette, Sparkles, Type, WandSparkles } from "@/components/icons";
import type { Clip } from "@/lib/editor/model";
import type { CaptionStyle } from "@/lib/editor/captionStyle";
import type { TextPreset } from "@/lib/creative/textPresets";
import type { GiphyAssetItem } from "@/lib/creative/giphy";
import type { VectorElement } from "@/lib/creative/iconify";
import type { VectorShape } from "@/lib/creative/shapes";
import type { MotionAsset } from "@/lib/creative/motionAssets";
import type { VisualAnimation } from "@/lib/creative/animations";

import EffectsBrowser from "./creative/EffectsBrowser";
import TransitionsBrowser from "./creative/TransitionsBrowser";
import AnimationsBrowser from "./creative/AnimationsBrowser";
import TextTemplatesBrowser from "./creative/TextTemplatesBrowser";
import CaptionsBrowser from "./creative/CaptionsBrowser";
import FontBrowser from "./creative/FontBrowser";
import StickersBrowser from "./creative/StickersBrowser";
import ElementsBrowser from "./creative/ElementsBrowser";

export type CreativePanelKind =
  | "effects"
  | "filters"
  | "transitions"
  | "animations"
  | "text"
  | "captions"
  | "fonts"
  | "stickers"
  | "elements";

interface Props {
  kind: CreativePanelKind | string;
  clip: Clip | null;
  onApply?: (patch: Partial<Clip>) => void;
  onAddTextTemplate?: (preset: TextPreset) => void;
  onAddSticker?: (sticker: GiphyAssetItem) => void;
  onAddVectorElement?: (element: VectorElement) => void;
  onAddShape?: (shape: VectorShape) => void;
  onAddMotionAsset?: (motion: MotionAsset) => void;
  captionStyle?: CaptionStyle;
  onCaptionStyle?: (patch: Partial<CaptionStyle>) => void;
  selectedFont?: string;
  onSelectFont?: (family: string) => void;
}

export default function CreativePanel({
  kind,
  clip,
  onApply,
  onAddTextTemplate,
  onAddSticker,
  onAddVectorElement,
  onAddShape,
  onAddMotionAsset,
  captionStyle,
  onCaptionStyle,
  selectedFont,
  onSelectFont,
}: Props) {
  const [internalKind, setInternalKind] = useState<CreativePanelKind>(() => {
    if (kind === "effects" || kind === "filters" || kind === "transitions" || kind === "animations" || kind === "stickers" || kind === "elements" || kind === "fonts") {
      return kind as CreativePanelKind;
    }
    return "effects";
  });

  const activeKind = (kind === "effects" || kind === "transitions" || kind === "stickers" || kind === "elements") ? kind : internalKind;

  return (
    <>
      <div className="panel-header">
        <span className="title">
          {activeKind === "effects" || activeKind === "filters" ? (
            <><WandSparkles size={15} />אפקטים ולוקים</>
          ) : activeKind === "transitions" ? (
            <><Blend size={15} />מעברים ו-Fade</>
          ) : activeKind === "animations" ? (
            <><Sparkles size={15} />אנימציות קליפ</>
          ) : activeKind === "stickers" ? (
            <><Palette size={15} />סטיקרים ו-GIFs</>
          ) : activeKind === "elements" ? (
            <><Layers size={15} />אלמנטים וצורות</>
          ) : activeKind === "fonts" ? (
            <><Type size={15} />גופנים</>
          ) : (
            <><Sparkles size={15} />ספריית יצירה</>
          )}
        </span>
      </div>

      <div className="panel-scroll creative-panel-hub">
        {activeKind === "effects" || activeKind === "filters" ? (
          <EffectsBrowser
            clip={clip}
            onApplyEffect={(effectId, amount) => onApply?.({ effectId, effectAmount: amount ?? 1 })}
            onClearEffect={() => onApply?.({ effectId: "none", effectAmount: 1 })}
          />
        ) : activeKind === "transitions" ? (
          <TransitionsBrowser
            clip={clip}
            onApplyFade={(visualFadeIn, visualFadeOut) => onApply?.({ visualFadeIn, visualFadeOut })}
            onApplyTransition={(tId) => {
              // Connect transition preset
              if (clip) onApply?.({ effectId: `tr_${tId}` });
            }}
          />
        ) : activeKind === "animations" ? (
          <AnimationsBrowser
            onApplyAnimation={(anim) => {
              if (clip) onApply?.({ effectId: `anim_${anim.id}` });
            }}
          />
        ) : activeKind === "stickers" ? (
          <StickersBrowser
            onAddStickerOverlay={(sticker) => onAddSticker?.(sticker)}
          />
        ) : activeKind === "elements" ? (
          <ElementsBrowser
            onAddVectorElement={(elem) => onAddVectorElement?.(elem)}
            onAddShape={(shape) => onAddShape?.(shape)}
            onAddMotionAsset={(motion) => onAddMotionAsset?.(motion)}
          />
        ) : activeKind === "fonts" ? (
          <FontBrowser
            selectedFont={selectedFont || captionStyle?.fontFamily}
            onSelectFont={(family) => {
              onSelectFont?.(family);
              onCaptionStyle?.({ fontFamily: family });
            }}
          />
        ) : activeKind === "captions" ? (
          <CaptionsBrowser
            currentStyle={captionStyle}
            onApplyStyle={(patch) => onCaptionStyle?.(patch)}
          />
        ) : (
          <TextTemplatesBrowser
            onAddTextTemplate={(preset) => onAddTextTemplate?.(preset)}
          />
        )}
      </div>
    </>
  );
}

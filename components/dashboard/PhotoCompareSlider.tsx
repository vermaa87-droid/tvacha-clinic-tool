"use client";

import {
  ReactCompareSlider,
  ReactCompareSliderImage,
  ReactCompareSliderHandle,
} from "react-compare-slider";

/**
 * Thin wrapper around react-compare-slider so PatientProgressPhotosTab can
 * dynamic-import the whole ~15 KB library from a single entry point.
 * Only rendered when the user has picked a before/after pair, so dropping
 * its static import shaves the cost off every other tab on the patient
 * detail page.
 */
export interface PhotoCompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
}

export default function PhotoCompareSlider({
  beforeSrc,
  afterSrc,
}: PhotoCompareSliderProps) {
  return (
    <ReactCompareSlider
      itemOne={
        <ReactCompareSliderImage
          src={beforeSrc}
          alt="Before"
          style={{ objectFit: "contain", backgroundColor: "#1a1612" }}
        />
      }
      itemTwo={
        <ReactCompareSliderImage
          src={afterSrc}
          alt="After"
          style={{ objectFit: "contain", backgroundColor: "#1a1612" }}
        />
      }
      handle={
        <ReactCompareSliderHandle
          buttonStyle={{
            backgroundColor: "#b8936a",
            border: "2px solid #faf8f4",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
          linesStyle={{ backgroundColor: "#b8936a", width: 3 }}
        />
      }
    />
  );
}

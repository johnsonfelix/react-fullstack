"use client";

import { useState } from "react";
import SlideWhatYouWant from "./SlideWhatYouWant";
import SlideRequestTypeCategory from "./SlideRequestTypeCategory";
import SlideAddress from "./SlideAddress";
import SlideGoods from "./SlideGoods";
import SlideScopeOfWork from "./SlideScopeOfWork";
import SlideReview from "./SlideReview";
import SlideAIQuestions from "./SlideAIQuestions";

export default function NewProcurementPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [procurementDraft, setProcurementDraft] = useState<any>({
    items: [],
  });

  const next = () => setCurrentSlide(currentSlide + 1);
  const prev = () => setCurrentSlide(currentSlide - 1);

  return (
    <div className="max-w-3xl mx-auto p-8">
      {currentSlide === 0 && (
        <SlideWhatYouWant
          procurementDraft={procurementDraft}
          setProcurementDraft={setProcurementDraft}
          next={next}
        />
      )}
      {currentSlide === 1 && (
        <SlideRequestTypeCategory
          procurementDraft={procurementDraft}
          setProcurementDraft={setProcurementDraft}
          next={next}
          prev={prev}
        />
      )}
      {currentSlide === 2 && (
        <SlideAddress
          procurementDraft={procurementDraft}
          setProcurementDraft={setProcurementDraft}
          next={next}
          prev={prev}
        />
      )}
      {currentSlide === 3 && (
        <SlideGoods
          procurementDraft={procurementDraft}
          setProcurementDraft={setProcurementDraft}
          next={next}
          prev={prev}
        />
      )}
      {currentSlide === 4 && (
        <SlideScopeOfWork
          procurementDraft={procurementDraft}
          setProcurementDraft={setProcurementDraft}
          next={next}
          prev={prev}
        />
      )}
      {currentSlide === 5 && (
  <SlideAIQuestions
    procurementDraft={procurementDraft}
    setProcurementDraft={setProcurementDraft}
    next={next}
    prev={prev}
  />
)}
{currentSlide === 6 && (
  <SlideReview
    procurementDraft={procurementDraft}
    prev={prev}
  />
)}
    </div>
  );
}

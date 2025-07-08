import Lottie from "lottie-react";

export default function AssistantWidget() {
  return (
    <div className="fixed bottom-4 right-4 w-24 h-24 z-50 pointer-events-none">
      <Lottie
        animationData={require('../../public/animations/assistant.json')}
        loop
        autoplay
      />
    </div>
  );
}

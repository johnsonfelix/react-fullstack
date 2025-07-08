export function Switch({ checked, onCheckedChange }:any) {
  return (
    <button
      onClick={() => onCheckedChange(!checked)}
      className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow transform transition ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}
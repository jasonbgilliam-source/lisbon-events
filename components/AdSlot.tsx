'use client';

type Props = {
  id?: string;
  slotId?: string;
};

export default function AdSlot({ id, slotId }: Props) {
  const resolved = id ?? slotId ?? 'unknown';

  return (
    <div
      className="bg-white border border-orange-200 rounded-2xl shadow-sm py-4 my-6 text-center"
    >
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
        Advertisement
      </div>
      <div className="text-sm font-semibold text-[#c94917]">
        Ad Slot: {resolved}
      </div>
    </div>
  );
}
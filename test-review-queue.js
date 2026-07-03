const reviewItems = [
  { target: "A", action: "review", notScamWeight: 1 },
  { target: "B", action: "auto_block", notScamWeight: 0 },
  { target: "C", action: "review", notScamWeight: 3 }
];

const queue = reviewItems
  .filter(item => item.action === "review")
  .sort((a, b) => (b.notScamWeight || 0) - (a.notScamWeight || 0));

console.log(JSON.stringify({
  reviewCount: queue.length,
  firstTarget: queue[0].target,
  firstWeight: queue[0].notScamWeight
}, null, 2));

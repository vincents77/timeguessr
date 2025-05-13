 
  export function getGradientClass(value, allValues, invert = false) {
    if (value == null) return 'bg-gray-100';
  
    const cleanVals = allValues.filter(v => v != null).sort((a, b) => a - b);
    if (!cleanVals.length) return 'bg-gray-100';
  
    // Calculate thresholds for 5 bins
    const percentile = p => cleanVals[Math.floor(p * cleanVals.length)];
    const thresholds = [
      percentile(0.2),
      percentile(0.4),
      percentile(0.6),
      percentile(0.8)
    ];
    if (invert) thresholds.reverse();
  
    // Assign Tailwind class based on bin
    if ((invert ? value >= thresholds[0] : value <= thresholds[0])) return 'bg-blue-50';
    if ((invert ? value >= thresholds[1] : value <= thresholds[1])) return 'bg-blue-100';
    if ((invert ? value >= thresholds[2] : value <= thresholds[2])) return 'bg-blue-200';
    if ((invert ? value >= thresholds[3] : value <= thresholds[3])) return 'bg-blue-300';
    return 'bg-blue-500';
  }
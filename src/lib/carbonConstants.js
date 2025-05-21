const emissionFactors = {
  // Metals
  'aluminium': 0.283, // Average of 0.5 [1] and 0.066 [2]
  'besi-tebal': 0.2005, // Average of 0.357 [3] and 0.044 [4]
  'besi-tipis': 0.2005, // Average of 0.357 [3] and 0.044 [4]
  'kaleng': 0.2115, // Assuming steel can, average of steel recycling factors (0.357 [3], 0.044 [4], 0.9 [5], using average of first two)
  'kuningan': 1.06, // Using midpoint of copper secondary production range (0.2 - 1.9) [6] as proxy
  'perunggu': 1.06, // Using midpoint of copper secondary production range (0.2 - 1.9) [6] as proxy
  'seng': 2.15, // Average of primary [7] and recycled [8] zinc (<1.6 and <3.8)
  'tembaga': 1.099, // Average of recycled wire (0.198) [9] and midpoint of secondary production (1.06) [6]
  'sepeda': 0.0057, // Based on lifecycle emission calculation

  // Paper/Cardboard
  'kardus-bagus': -3.44, // Using net negative emission factor for recycled corrugated containers
  'kardus-jelek': -3.44, // Using net negative emission factor for recycled corrugated containers
  'koran': -3.03, // Using net negative emission factor for recycling newspaper
  'majalah': -3.38, // Using net negative emission factor for recycled magazines
  'hvs': -3.15, // Using net negative emission factor for recycling office paper
  'duplek': -3.5, // Using average factor for mixed paper recycling
  'buram': -3.5, // Using average factor for mixed paper recycling
  'sak-semen': -3.5, // Using average factor for mixed paper recycling

  // Plastics
  'botol-bening': -1.04, // Using net negative emission factor for recycling PET
  'botol-bensin': -1.04, // Using net negative emission factor for recycling PET
  'botol-bir': -1.04, // Using net negative emission factor for recycling PET
  'botol-kecap': -1.04, // Using net negative emission factor for recycling PET
  'botol-warna': -1.04, // Using net negative emission factor for recycling PET
  'galon-utuh': -1.04, // Using net negative emission factor for recycling PET
  'pet-bening': -1.04, // Using net negative emission factor for recycling PET
  'pet-biru': -1.04, // Using net negative emission factor for recycling PET
  'pet-galon': -1.04, // Using net negative emission factor for recycling PET
  'pet-jelek': -1.04, // Using net negative emission factor for recycling PET
  'pet-kotor': -1.04, // Using net negative emission factor for recycling PET
  'pet-warna': -1.04, // Using net negative emission factor for recycling PET
  'plastik-bening': -0.93, // Using net negative emission factor for recycling mixed plastics
  'plastik-keras': -0.88, // Using net negative emission factor for recycling HDPE
  'ps-kaca': 2.50, // Using primary PS production factor as recycling data not available
  'kresek': 0.00158, // Using single-use plastic bag carbon footprint
  'bak-campur': -0.93, // Using net negative emission factor for recycling mixed plastics
  'bak-hitam': -0.93, // Using net negative emission factor for recycling mixed plastics

  // Organic
  'jelantah': 0, // Using market value as proxy, though lifecycle might differ
  'karak': 0.09, // Using average of composting [13, 14] and anaerobic digestion [15] factors (0.1756 + 0.0224)
  'gembos': 0.09, // Using average of composting [13, 14] and anaerobic digestion [15] factors (0.1756 + 0.0224)

  // Other recyclables
  'karung-100': 0.11, // Using average of PE recycling (0.00) and PP recycling (0.22) in kg CO2e/kg
  'karung-200': 0.11, // Using average of PE recycling (0.00) and PP recycling (0.22) in kg CO2e/kg
  'karung-kecil': 0.11, // Using average of PE recycling (0.00) and PP recycling (0.22) in kg CO2e/kg
  'keping-cd': -0.93, // Using proxy of recycled mixed plastics
  'kabel': 0.122, // Average of processed material (~0.05 [16]) and recycled copper wire (0.198) [9]
  'sachet': -0.93, // Using proxy of recycled mixed plastics
  'sablon-tebal': -3.5, // Assuming paper, using mixed paper recycling factor
  'sablon-tipis': -3.5, // Assuming paper, using mixed paper recycling factor
  'lembaran-campur': -0.93, // Using proxy of recycled mixed plastics
  'tutup-amdk': -0.88, // Assuming HDPE, using recycling factor
  'tutup-campur': -0.88, // Assuming HDPE, using recycling factor
  'tutup-galon': -0.88, // Assuming HDPE, using recycling factor
};

// Export the emission factors so they can be imported by other files
export { emissionFactors };

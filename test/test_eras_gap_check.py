# Simple Python script to check for gaps and overlaps in an "eras" table

import pandas as pd

def check_eras_gaps(csv_path):
    # Load CSV
    df = pd.read_csv(csv_path)

    # Standardize columns
    df['start'] = df['start'].astype(int)
    df['end'] = df['end'].astype(int)

    problems = []

    # Group by Region and Country for independent checking
    for (region, country), group in df.groupby(['region', 'country']):
        group = group.sort_values('start')

        previous_end = None
        for _, row in group.iterrows():
            if previous_end is not None:
                if row['start'] > previous_end + 1:
                    problems.append(f"⛔ Gap in {region} - {country}: {previous_end+1} to {row['start']-1}")
                elif row['start'] <= previous_end:
                    problems.append(f"⚠️ Overlap in {region} - {country}: {previous_end} to {row['start']}")
            previous_end = row['end']

    if problems:
        print("\n".join(problems))
    else:
        print("✅ No gaps or overlaps detected!")

# Example usage
# check_eras_gaps('eras.csv')  # Replace with your actual file name

export interface WorkspaceBrandingInput {
  section: string;
  department?: string;
  specialization?: string;
  program?: string;
  displayName?: string;
  accentColor?: string;
  academicYear?: string;
  semester?: number;
}

export interface WorkspaceBranding {
  name: string; // e.g. "J-Connect", "G-Connect"
  section: string; // e.g. "J"
  displayName: string; // e.g. "CSE AI & ML — Section J"
  subheading: string; // e.g. "SRM University–AP • B.Tech CSE (AI & ML)"
  fullTitle: string; // e.g. "J-Connect | CSE AI & ML — Section J"
  accentColor: string; // e.g. "#6366f1"
  badgeText: string; // e.g. "Sec J"
}

/**
 * Dynamically generates the workspace brand identity based on workspace.section.
 * Adheres to the core Section-Connect rule: `${section}-Connect`.
 */
export function getWorkspaceBranding(workspace: WorkspaceBrandingInput | null | undefined): WorkspaceBranding {
  if (!workspace || !workspace.section) {
    return {
      name: "Section-Connect",
      section: "All",
      displayName: "University Class Portal",
      subheading: "SRM University–AP",
      fullTitle: "Section-Connect | University Class Portal",
      accentColor: "#842343",
      badgeText: "Platform",
    };
  }

  const cleanSection = workspace.section.trim().toUpperCase();
  const name = `${cleanSection}-Connect`;
  const displayName =
    workspace.displayName ||
    `${workspace.specialization ? `CSE (${workspace.specialization})` : workspace.department || "Class"} — Section ${cleanSection}`;

  const subheading = `SRM University–AP • ${workspace.program || "B.Tech"} ${workspace.specialization || workspace.department || ""}`.trim();
  const fullTitle = `${name} | ${displayName}`;

  return {
    name,
    section: cleanSection,
    displayName,
    subheading,
    fullTitle,
    accentColor: workspace.accentColor && workspace.accentColor !== "#6366f1"
      ? workspace.accentColor
      : getSectionAccentColor(cleanSection),
    badgeText: `Sec ${cleanSection}`,
  };
}

/**
 * Returns a distinct aesthetic accent color for a class section if not overridden
 */
export function getSectionAccentColor(section: string): string {
  const upper = section.toUpperCase();
  switch (upper) {
    case "J":
      return "#842343";
    case "G":
      return "#10b981"; // Emerald
    case "K":
      return "#f59e0b"; // Amber
    case "A":
      return "#06b6d4"; // Cyan
    case "B":
      return "#ec4899"; // Pink / Rose
    case "C":
      return "#8b5cf6"; // Purple
    case "D":
      return "#14b8a6"; // Teal
    default:
      return "#3b82f6"; // Blue
  }
}

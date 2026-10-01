import { validateSrmEmail } from "./auth";

export interface ParsedStudentRow {
  name: string;
  email: string;
  rollNumber: string;
  isValid: boolean;
  errors: string[];
}

export interface CsvValidationResult {
  totalRows: number;
  validRows: ParsedStudentRow[];
  invalidRows: ParsedStudentRow[];
  duplicates: {
    emails: string[];
    rollNumbers: string[];
  };
}

/**
 * Parses and validates CSV string for bulk student import.
 * Format: name,email,rollNumber
 * Enforces @srmap.edu.in, valid roll numbers, and duplicate detection.
 */
export function validateStudentCsv(csvContent: string): CsvValidationResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      duplicates: { emails: [], rollNumbers: [] },
    };
  }

  // Detect and skip header row if present
  let startIndex = 0;
  const firstLineLower = lines[0].toLowerCase();
  if (firstLineLower.includes("email") || firstLineLower.includes("name") || firstLineLower.includes("roll")) {
    startIndex = 1;
  }

  const seenEmails = new Set<string>();
  const seenRolls = new Set<string>();
  const duplicateEmails = new Set<string>();
  const duplicateRolls = new Set<string>();

  const validRows: ParsedStudentRow[] = [];
  const invalidRows: ParsedStudentRow[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
    const name = parts[0] || "";
    const email = (parts[1] || "").toLowerCase();
    const rollNumber = (parts[2] || "").toUpperCase();

    const errors: string[] = [];

    if (!name || name.length < 2) {
      errors.push("Name is required (at least 2 chars)");
    }

    if (!email) {
      errors.push("Email is required");
    } else if (!validateSrmEmail(email)) {
      errors.push("Email must belong to @srmap.edu.in domain");
    }

    if (!rollNumber) {
      errors.push("Roll number is required");
    } else if (rollNumber.length < 5) {
      errors.push("Invalid roll number format");
    }

    // Check duplicates within CSV
    if (email) {
      if (seenEmails.has(email)) {
        errors.push(`Duplicate email in CSV: ${email}`);
        duplicateEmails.add(email);
      } else {
        seenEmails.add(email);
      }
    }

    if (rollNumber) {
      if (seenRolls.has(rollNumber)) {
        errors.push(`Duplicate roll number in CSV: ${rollNumber}`);
        duplicateRolls.add(rollNumber);
      } else {
        seenRolls.add(rollNumber);
      }
    }

    const row: ParsedStudentRow = {
      name,
      email,
      rollNumber,
      isValid: errors.length === 0,
      errors,
    };

    if (row.isValid) {
      validRows.push(row);
    } else {
      invalidRows.push(row);
    }
  }

  return {
    totalRows: lines.length - startIndex,
    validRows,
    invalidRows,
    duplicates: {
      emails: Array.from(duplicateEmails),
      rollNumbers: Array.from(duplicateRolls),
    },
  };
}

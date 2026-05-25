/**
 * Filters test cases based on a search term
 * Searches only in the name field
 */
export const filterTestCasesBySearch = (testCases: any[], searchTerm: string): any[] => {
  if (!searchTerm) return testCases;

  const searchLower = searchTerm.toLowerCase();

  return testCases.filter((testCase: any) => {
    const name = typeof testCase.name === 'string' ? testCase.name.toLowerCase() : '';
    return name.includes(searchLower);
  });
};

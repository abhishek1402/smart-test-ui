/**
 * @file types.ts
 * @description Type definitions for test case generation
 */

export interface BackendTestCase {
  original_tc_id: string;
  title: string;
  description: string;
  product_id: string;
  subproduct_id: string;
  feature_id: string;
  status: string;
  priority: string;
  expected_result: string;
  flow: string;
  labels: string;
  api: string;
  method: string;
  owner: string;
  modified_by: string;
  is_flaky: string;
  automation_status: string;
}

export interface FrontendTestCase {
  original_tc_id: string;
  product_id: string;
  subproduct_id: string;
  feature_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  expected_result: string;
  test_step: string;
  labels: string;
  owner: string;
  modified_by: string;
  automation_status: string;
  test_data: string;
  blocked: string;
  blocked_why: string;
}

export interface ApiSummary {
  id: string;
  originalIndex: number;
  method: string;
  url: string;
  statusCode?: number;
  requestBody?: any;
  responseBody?: any;
  headers?: any;
}

export interface StepSummary {
  id: string;
  originalIndex: number;
  stepNumber: number;
  title: string;
  actionType: string;
  selector?: string;
  value?: string;
  expectedOutcome?: string;
}

export const BACKEND_JSON_KEYS: (keyof BackendTestCase)[] = [
  'original_tc_id', 'title', 'description', 'product_id', 'subproduct_id',
  'feature_id', 'status', 'priority', 'expected_result', 'flow',
  'labels', 'api', 'method', 'owner', 'modified_by', 'is_flaky', 'automation_status'
];

export const FRONTEND_JSON_KEYS: (keyof FrontendTestCase)[] = [
  'original_tc_id', 'product_id', 'subproduct_id', 'feature_id', 'title',
  'description', 'status', 'priority', 'expected_result', 'test_step',
  'labels', 'owner', 'modified_by', 'automation_status', 'test_data',
  'blocked', 'blocked_why'
];
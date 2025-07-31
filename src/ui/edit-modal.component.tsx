import React, { useState, useEffect } from 'react';
import { highlight, languages } from 'prismjs';
import Editor from 'react-simple-code-editor';

interface EditModalProps {
  isOpen: boolean;
  testCase: { name: string; test: string; _id: string; preTestId: string } | null;
  onClose: () => void;
  onSave: (testId: string, updatedData: { name?: string; test?: string }) => Promise<void>;
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  testCase,
  onClose,
  onSave,
}) => {
  const [editedName, setEditedName] = useState('');
  const [editedTest, setEditedTest] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (testCase) {
      setEditedName(testCase.name);
      setEditedTest(testCase.test);
    }
  }, [testCase]);

  const handleSave = async () => {
    if (!testCase) return;
    
    setSaving(true);
    try {
      const updatedData = {
        name: editedName,
        test: editedTest
      };
      
      await onSave(testCase._id, updatedData);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (testCase) {
      setEditedName(testCase.name);
      setEditedTest(testCase.test);
    }
    onClose();
  };

  if (!isOpen || !testCase) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Test Case</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 p-6 flex flex-col">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Case Name
            </label>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter test case name"
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Script
            </label>
            <div className="flex-1 relative">
              <textarea
                value={editedTest}
                onChange={(e) => setEditedTest(e.target.value)}
                className="w-full h-full min-h-[400px] p-4 pb-8 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-auto"
                style={{
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 14,
                  backgroundColor: '#ffffff',
                  lineHeight: '1.5',
                  paddingBottom: '32px',
                }}
                placeholder="Enter your test script here..."
                spellCheck={false}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-4 p-6 border-t">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
import React from 'react';

interface IInputProps {
  label: string;
  value: string;
  onChange(str: string, e?: Event): void;
}

export const Input = ({ label, value, onChange }: IInputProps) => {
    return (
      <>
        <label>{label}</label>
        <input type='text' value={value} onChange={(e) => onChange(e.target.value)} />
      </>
    )
  }
  
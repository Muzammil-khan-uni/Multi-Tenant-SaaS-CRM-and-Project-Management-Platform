import { useState, useCallback } from 'react';

export const useForm = (schema, onSubmit) => {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      setValues((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));

      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: '' }));
      }
    },
    [errors]
  );

  const validate = useCallback(() => {
    try {
      if (schema) {
        schema.parse(values);
      }
      setErrors({});
      return true;
    } catch (error) {
      const formattedErrors = {};
      error.errors?.forEach((err) => {
        const path = err.path.join('.');
        formattedErrors[path] = err.message;
      });
      setErrors(formattedErrors);
      return false;
    }
  }, [values, schema]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsSubmitting(true);

      if (validate()) {
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Form submission error:', error);
        }
      }

      setIsSubmitting(false);
    },
    [validate, onSubmit, values]
  );

  const resetForm = useCallback(() => {
    setValues({});
    setErrors({});
  }, []);

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm,
    setFieldValue,
    setValues,
  };
};

import { useState } from 'react';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  Save,
  MapPin,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

const AddEmployee = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    position: { title: '', level: 'junior' },
    department: { name: '' },
    employmentType: 'full_time',
    phone: '',
    hireDate: new Date().toISOString().split('T')[0],
    dateOfBirth: '',
    gender: '',
    probationEndDate: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    salary: { amount: 0, currency: 'USD', type: 'annual' },
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const updateNestedField = (parent, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim())
      newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = 'Enter a valid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8)
      newErrors.password = 'Min 8 characters';
    if (!formData.position.title.trim())
      newErrors.positionTitle = 'Position is required';
    if (!formData.department.name.trim())
      newErrors.departmentName = 'Department is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.hireDate) newErrors.hireDate = 'Hire date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        position: {
          title: formData.position.title.trim(),
          level: formData.position.level,
        },
        department: { name: formData.department.name.trim() },
        employmentType: formData.employmentType,
        hireDate: formData.hireDate,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        probationEndDate: formData.probationEndDate || undefined,
        address: {
          street: formData.street?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          state: formData.state?.trim() || undefined,
          zipCode: formData.zipCode?.trim() || undefined,
          country: formData.country?.trim() || undefined,
        },
        personalInfo: {
          phone: formData.phone.trim(),
          dateOfBirth: formData.dateOfBirth || undefined,
          gender: formData.gender || undefined,
          address: {
            street: formData.street?.trim() || undefined,
            city: formData.city?.trim() || undefined,
            state: formData.state?.trim() || undefined,
            zipCode: formData.zipCode?.trim() || undefined,
            country: formData.country?.trim() || undefined,
          },
        },
        workInfo: {
          hireDate: formData.hireDate,
          probationEndDate: formData.probationEndDate || undefined,
          salary: {
            amount: Number(formData.salary.amount) || 0,
            currency: formData.salary.currency || 'USD',
            type: formData.salary.type || 'annual',
          },
        },
      };

      const { data } = await axios.post('/employees', payload);
      toast.success('Employee created successfully!');
      navigate(`/employees/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Employee"
        description="Create a new employee record"
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/employees')}
            icon={ArrowLeft}
          >
            Back to Employees
          </Button>
          <Button
            form="add-employee-form"
            type="submit"
            loading={loading}
            icon={Save}
          >
            Create Employee
          </Button>
        </div>
      </PageHeader>

      <form id="add-employee-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    icon={User}
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    error={errors.firstName}
                  />
                  <Input
                    label="Last Name *"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    error={errors.lastName}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email *"
                    type="email"
                    icon={Mail}
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    error={errors.email}
                  />
                  <Input
                    label="Password *"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    error={errors.password}
                  />
                </div>
                <Input
                  label="Phone *"
                  icon={Phone}
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  error={errors.phone}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Date of Birth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => updateField('gender', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Position Title *"
                    icon={Briefcase}
                    placeholder="e.g., Software Engineer"
                    value={formData.position.title}
                    onChange={(e) =>
                      updateNestedField('position', 'title', e.target.value)
                    }
                    error={errors.positionTitle}
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Level
                    </label>
                    <select
                      value={formData.position.level}
                      onChange={(e) =>
                        updateNestedField('position', 'level', e.target.value)
                      }
                      className="input-field"
                    >
                      <option value="junior">Junior</option>
                      <option value="mid">Mid</option>
                      <option value="senior">Senior</option>
                      <option value="lead">Lead</option>
                      <option value="manager">Manager</option>
                      <option value="director">Director</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Department *"
                    icon={Building2}
                    placeholder="e.g., Engineering"
                    value={formData.department.name}
                    onChange={(e) =>
                      updateNestedField('department', 'name', e.target.value)
                    }
                    error={errors.departmentName}
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Employment Type
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) =>
                        updateField('employmentType', e.target.value)
                      }
                      className="input-field"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                      <option value="consultant">Consultant</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Hire Date *"
                    type="date"
                    icon={Calendar}
                    value={formData.hireDate}
                    onChange={(e) => updateField('hireDate', e.target.value)}
                    error={errors.hireDate}
                  />
                  <Input
                    label="Probation End Date"
                    type="date"
                    icon={Calendar}
                    value={formData.probationEndDate}
                    onChange={(e) =>
                      updateField('probationEndDate', e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Street"
                  icon={MapPin}
                  placeholder="123 Main St"
                  value={formData.street}
                  onChange={(e) => updateField('street', e.target.value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                  <Input
                    label="State / Province"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Zip / Postal Code"
                    value={formData.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                  />
                  <Input
                    label="Country"
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Salary Information */}
            <Card>
              <CardHeader>
                <CardTitle>Salary Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Amount"
                  type="number"
                  icon={DollarSign}
                  placeholder="0"
                  value={formData.salary.amount}
                  onChange={(e) =>
                    updateNestedField(
                      'salary',
                      'amount',
                      Number(e.target.value)
                    )
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.salary.currency}
                      onChange={(e) =>
                        updateNestedField('salary', 'currency', e.target.value)
                      }
                      className="input-field"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="PKR">PKR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Type
                    </label>
                    <select
                      value={formData.salary.type}
                      onChange={(e) =>
                        updateNestedField('salary', 'type', e.target.value)
                      }
                      className="input-field"
                    >
                      <option value="annual">Annual</option>
                      <option value="monthly">Monthly</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="font-medium">
                      {formData.firstName} {formData.lastName || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium">{formData.email || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Position</span>
                    <span className="font-medium">
                      {formData.position.title || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Department</span>
                    <span className="font-medium">
                      {formData.department.name || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hire Date</span>
                    <span className="font-medium">
                      {formData.hireDate || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Salary</span>
                    <span className="font-medium">
                      {formData.salary.currency}{' '}
                      {formData.salary.amount?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddEmployee;

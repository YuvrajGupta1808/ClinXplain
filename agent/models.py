from pydantic import BaseModel, Field
from typing import List, Optional

class MedicalCondition(BaseModel):
    conditionName: str
    status: str = "Active"
    diagnosisDate: Optional[str] = None

class Symptom(BaseModel):
    name: str
    onsetDate: Optional[str] = None
    location: Optional[str] = None
    severityScale: Optional[int] = Field(None, ge=1, le=10)
    frequency: Optional[str] = None
    associatedSymptoms: List[str] = []
    aggravatingFactors: List[str] = []
    relievingFactors: List[str] = []

class Medication(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    startDate: Optional[str] = None
    prescribingSource: Optional[str] = None
    adherence: Optional[str] = None

class Allergy(BaseModel):
    allergenName: str
    reactionType: Optional[str] = None
    severity: Optional[str] = None

class ClinicalVisitData(BaseModel):
    primaryConcern: Optional[str] = None
    hpi: Optional[str] = None
    symptoms: List[Symptom] = []
    medications: List[Medication] = []
    allergies: List[Allergy] = []
    conditions: List[MedicalCondition] = []
    primaryDiagnosis: Optional[str] = None
    differentialDiagnoses: List[str] = []
    clinicalReasoning: Optional[str] = None
    plan: List[str] = []
    nextSteps: List[str] = []

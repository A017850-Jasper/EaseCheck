export interface SubDivision {
  DivisionCode: string;
  DivisionName: string;
  NetworkDivisionDesc: string | null;
}

export interface Division {
  DivisionCode: string;
  DivisionName: string;
  SubDivisions: SubDivision[];
}

export interface ClinicProgress {
  VisitDate: string;
  ShiftCode: string;
  ShiftName: string;
  DivisionCode: string;
  DivisionName: string;
  ClinicCode: string;
  ClinicName: string;
  DoctorEmpNo: string;
  DoctorName: string;
  ClinicVisitState: string;
  ShiftBeginTimeStamp: string;
  ShiftEndTimeStamp: string;
  PassedSeqCount: number;
  CurrentVisitSeq: string;
  CurrentVisitSeqCode: string;
  CurrentVisitSeqDesc: string;
  NextVisitSeq: string;
  NextVisitSeqCode: string;
  NextVisitSeqDesc: string;
  CallSequenceCode: string;
  CheckInCount: string;
}

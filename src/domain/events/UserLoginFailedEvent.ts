import { IDomainEvent, UniqueEntityID } from "@ogza/core";
import { User } from "../User";

export class UserLoginFailedEvent implements IDomainEvent {
  public dateTimeOccurred: Date;
  public user: User;
  public ipAddress: string;
  public userAgent: string;
  public reason: string;

  constructor(user: User, ip: string, agent: string, reason: string) {
    this.dateTimeOccurred = new Date();
    this.user = user;
    this.ipAddress = ip;
    this.userAgent = agent;
    this.reason = reason;
  }

  getAggregateId(): UniqueEntityID {
    return this.user.id;
  }
}